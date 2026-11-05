// SpellsChess: мини-сервер. Раздаёт файлы игры и передаёт ходы между двумя игроками.
// Запуск: node server.js   (или двойной клик по start.bat)
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
const rooms = {};   // код -> комната (см. makeRoom)
const SUPA_URL = process.env.SUPABASE_URL || 'https://fuqopbjpxeugdvnlxanb.supabase.co';
const SUPA_PUB = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_xVvPSDswx_P2D-kguqgznQ_5cjBAcMN';
const SUPA_SECRET = process.env.SUPABASE_SECRET_KEY || '';   // секретный ключ: ТОЛЬКО в переменных окружения Render, не в коде
const GRACE = 30000; // сколько секунд ждём, пока оборвавшийся игрок переподключится
let waitList = [];  // комнаты, где кто-то ждёт соперника в «Быстрой игре»: { code, tc } (tc: 'any', 'inf' или число минут)
const unwait = code => { waitList = waitList.filter(w => w.code !== code); };

const other = role => (role === 'host' ? 'guest' : 'host');
const push = (res, obj) => { if (res) res.write('data: ' + JSON.stringify(obj) + '\n\n'); };
const makeCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
const open = r => { push(r.host, { t: '__open' }); push(r.guest, { t: '__open' }); };

// Комната хранит журнал сообщений для каждого получателя: если связь на миг оборвалась,
// после переподключения пропущенное доставится заново (браузер сам шлёт Last-Event-ID).
const makeRoom = () => ({ quickMode: null, incv: 0, chatLog: [], lastReport: { host: 0, guest: 0 }, pub: null, tickets: new Set(), failN: 0, lockUntil: 0, inlog: null, seed: null, tcv: null, rated: true, user: { host: null, guest: null }, peer: { host: null, guest: null }, rep: { host: null, guest: null }, heroes: null, meta: null, gid: null, recorded: null, repTimer: null, host: null, guest: null, sid: { host: null, guest: null }, log: { host: [], guest: [] }, seq: { host: 0, guest: 0 }, lastMid: { host: 0, guest: 0 }, timer: {}, opened: false });
const deliver = (r, to, data) => {
    const id = ++r.seq[to];
    r.log[to].push({ id, data });
    if (r.log[to].length > 400) r.log[to].shift();
    if (r[to]) r[to].write('id: ' + id + '\ndata: ' + data + '\n\n');
};

// ---------- Аккаунты (Supabase): проверка входа и запись результатов ----------
const sbSignal = () => AbortSignal.timeout(8000);
async function sbUser(token) {
    try {
        const r = await fetch(SUPA_URL + '/auth/v1/user', { headers: { apikey: SUPA_PUB, Authorization: 'Bearer ' + token }, signal: sbSignal() });
        if (!r.ok) return null;
        const u = await r.json();
        return u && /^[0-9a-f-]{36}$/i.test(u.id || '') ? u.id : null;
    } catch (e) { return null; }
}
async function sbProfile(uid) {
    try {
        const r = await fetch(`${SUPA_URL}/rest/v1/profiles?id=eq.${uid}&select=nick,r_bullet,r_blitz,r_rapid,r_classic`, { headers: { apikey: SUPA_PUB }, signal: sbSignal() });
        const a = await r.json();
        return Array.isArray(a) && a[0] ? a[0] : null;
    } catch (e) { return null; }
}
async function handleAuth(room, r, role, token) {
    const o = other(role);
    let info = { nick: '', rating: 0, id: null };
    r.user[role] = null;
    if (typeof token === 'string' && token.length > 20 && token.length < 4096) {
        const uid = await sbUser(token);
        const prof = uid ? await sbProfile(uid) : null;
        if (uid && prof) { r.user[role] = { id: uid }; info = { nick: String(prof.nick || '').slice(0, 16), rating: r.quickMode ? (prof['r_' + r.quickMode] | 0) : 0, id: uid }; }
    }
    if (rooms[room] !== r) return;
    r.peer[role] = info;
    console.log('вход:', room, role, info.nick ? 'игрок ' + info.nick : 'гость');
    deliver(r, o, JSON.stringify({ t: 'peer', nick: info.nick, rating: info.rating, id: info.id }));
    if (r.peer[o]) deliver(r, role, JSON.stringify({ t: 'peer', nick: r.peer[o].nick, rating: r.peer[o].rating, id: r.peer[o].id }));
}
// Результат партии: оба игрока сообщают итог, записываем, если оба вошли в аккаунт и их сообщения совпали.
const FREE_HEROES = ['paladin', 'mage', 'necromancer'];   // герои, доступные в рейтинге без магического шара
const secretHeaders = (extra) => {
    const h = Object.assign({ apikey: SUPA_SECRET, 'Content-Type': 'application/json' }, extra || {});
    if (!SUPA_SECRET.startsWith('sb_')) h.Authorization = 'Bearer ' + SUPA_SECRET;
    return h;
};
// Проверка: открыты ли у игроков выбранные ими герои. При сбое базы не наказываем игроков (возвращаем true).
async function heroesAllowed(ids, heroes) {
    const need = ['w', 'b'].filter(s => !FREE_HEROES.includes(heroes[s]));
    if (!need.length) return true;
    try {
        const list = need.map(s => ids[s]).join(',');
        const r = await fetch(`${SUPA_URL}/rest/v1/user_unlocks?user_id=in.(${list})&select=user_id,heroes`, { headers: secretHeaders(), signal: sbSignal() });
        if (!r.ok) { console.log('user_unlocks: не удалось проверить героев', r.status); return true; }
        const rows = await r.json();
        return need.every(s => {
            const row = Array.isArray(rows) ? rows.find(x => x.user_id === ids[s]) : null;
            return !!(row && Array.isArray(row.heroes) && row.heroes.includes(heroes[s]));
        });
    } catch (e) { console.log('user_unlocks: сбой проверки', e.message); return true; }
}
// После записанной рейтинговой партии каждому игроку даём по одному шару (если в банке пусто) и сообщаем об этом
async function grantOrbs(r, gid, users) {
    for (const role of ['host', 'guest']) {
        let gained = false;
        try {
            const x = await fetch(SUPA_URL + '/rest/v1/rpc/grant_orb', { method: 'POST', headers: secretHeaders(), signal: sbSignal(), body: JSON.stringify({ p_game: gid, p_user: users[role] }) });
            if (x.ok) gained = (await x.json()) === true; else console.log('grant_orb: ОШИБКА', x.status, await x.text());
        } catch (e) { console.log('grant_orb: сбой', e.message); }
        deliver(r, role, JSON.stringify({ t: 'orb', gained }));
    }
}
async function recordGame(r) {
    if (!r.gid || r.recorded === r.gid) return;
    if (!SUPA_SECRET) { console.log('результат НЕ записан: в Render не задана переменная SUPABASE_SECRET_KEY'); return; }
    if (!r.user.host || !r.user.guest) return;
    const res = r.rep.host || r.rep.guest;
    r.recorded = r.gid;
    const gid = r.gid, rated = !!r.quickMode;
    const users = { host: r.user.host.id, guest: r.user.guest.id };
    const body = JSON.stringify({ p_game: gid, p_white: users.host, p_black: users.guest, p_result: res, p_wh: r.heroes ? r.heroes.w : null, p_bh: r.heroes ? r.heroes.b : null, p_reason: r.meta ? r.meta.reason : null, p_moves: r.meta ? r.meta.moves : null, p_rated: rated, p_mode: r.quickMode, p_inc: r.incv, p_seed: r.inlog ? r.seed : null, p_tc: r.tcv, p_log: r.inlog });
    if (rated && r.heroes && !(await heroesAllowed({ w: users.host, b: users.guest }, r.heroes))) {
        console.log('результат НЕ записан: в рейтинговой партии выбран закрытый герой', gid, r.heroes.w, r.heroes.b);
        return;
    }
    try {
        const x = await fetch(SUPA_URL + '/rest/v1/rpc/record_result', { method: 'POST', headers: secretHeaders(), signal: sbSignal(), body });
        if (!x.ok) { console.log('record_result: ОШИБКА', x.status, await x.text()); return; }
        console.log('результат записан:', gid, res);
        if (rated) await grantOrbs(r, gid, users);
    } catch (e) { console.log('record_result: сбой', e.message); }
}
function handleResult(r, role, res, msg) {
    console.log('итог партии от', role + ':', res, '| игра', r.gid || 'нет', '| оба вошли в аккаунт:', !!(r.user.host && r.user.guest));
    if (!r.gid || !['w', 'b', 'd'].includes(res) || r.recorded === r.gid) return;
    if (!r.user.host || !r.user.guest) return;
    r.rep[role] = res;
    if (msg && (role === 'host' || !r.meta)) r.meta = { reason: String(msg.reason || '').slice(0, 20), moves: Math.max(0, Math.min(999, msg.moves | 0)) };
    const o = other(role);
    if (r.rep[o]) {
        clearTimeout(r.repTimer);
        if (r.rep[o] === res) recordGame(r);           // совпало: записываем
        return;                                         // не совпало: не записываем вообще
    }
    clearTimeout(r.repTimer);
    r.repTimer = setTimeout(() => { if (!r[o] && !r.rep[o]) recordGame(r); }, 25000);   // соперник ушёл, не успев ответить
}


// ---------- Список комнат: создание (можно с паролем), просмотр, вход ----------
const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 32);
const readJson = (req, cb) => {
    let body = '';
    req.on('data', d => { body += d; if (body.length > 20000) req.destroy(); });
    req.on('end', () => { let j = {}; try { j = JSON.parse(body || '{}'); } catch (e) { } cb(j && typeof j === 'object' ? j : {}); });
};
const sendJson = (res, code, obj) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); };

const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    // Приложение (оболочка Capacitor) открывается с другого адреса, поэтому разрешаем запросы к серверу игры
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Last-Event-ID');
    if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
    const room = (url.searchParams.get('room') || '').toUpperCase().slice(0, 12);
    const role = url.searchParams.get('role');

    if (url.pathname === '/ping') { res.end('spellschess'); return; }

    // «Быстрый поиск»: рейтинговая партия в одном из четырёх режимов. Первый ждёт, второй подключается к нему.
    if (url.pathname === '/quick') {
        res.setHeader('Content-Type', 'application/json');
        const mode = url.searchParams.get('mode');
        if (!['bullet', 'blitz', 'rapid', 'classic'].includes(mode)) { res.statusCode = 400; res.end('{}'); return; }
        const idx = waitList.findIndex(w => rooms[w.code] && !rooms[w.code].guest && w.mode === mode);
        if (idx >= 0) {
            const code = waitList[idx].code;
            waitList.splice(idx, 1);
            res.end(JSON.stringify({ room: code, role: 'guest' }));
            return;
        }
        if (Object.keys(rooms).length > 500) { res.statusCode = 503; res.end('{}'); return; }
        const code = makeCode();
        const r = rooms[code] = makeRoom();
        r.quickMode = mode;
        waitList.push({ code, mode });
        setTimeout(() => {                       // если создатель так и не подключился
            const x = rooms[code];
            if (x && !x.host) { delete rooms[code]; unwait(code); }
        }, 60000);
        res.end(JSON.stringify({ room: code, role: 'host' }));
        return;
    }

    // Жалоба на соперника (из чата онлайн-партии)
    if (url.pathname === '/report' && req.method === 'POST') {
        readJson(req, async j => {
            const r = rooms[room];
            const sid = (url.searchParams.get('sid') || '').slice(0, 24);
            if (!r || (role !== 'host' && role !== 'guest') || !sid || r.sid[role] !== sid) { sendJson(res, 400, {}); return; }
            if (Date.now() - r.lastReport[role] < 30000) { sendJson(res, 429, {}); return; }
            r.lastReport[role] = Date.now();
            const o = other(role);
            const row = {
                reporter: r.user[role] ? r.user[role].id : null,
                offender: r.user[o] ? r.user[o].id : null,
                offender_nick: r.peer[o] ? r.peer[o].nick : null,
                reason: String(j.reason || 'Другое').slice(0, 40),
                details: String(j.text || '').slice(0, 500),
                game_id: r.gid,
                chat: r.chatLog.slice(-30)
            };
            console.log('ЖАЛОБА:', room, row.reason, '| на', row.offender_nick || 'гостя');
            if (SUPA_SECRET) {
                const headers = { apikey: SUPA_SECRET, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
                if (!SUPA_SECRET.startsWith('sb_')) headers.Authorization = 'Bearer ' + SUPA_SECRET;
                fetch(SUPA_URL + '/rest/v1/reports', { method: 'POST', headers, body: JSON.stringify(row), signal: sbSignal() })
                    .then(x => { if (!x.ok) x.text().then(t => console.log('reports: ОШИБКА', x.status, t)); })
                    .catch(e => console.log('reports: сбой', e.message));
            }
            sendJson(res, 200, { ok: true });
        });
        return;
    }

    // Список комнат
    if (url.pathname === '/lobby/list') {
        const list = Object.entries(rooms)
            .filter(([, r]) => r.pub && r.host && !r.guest)
            .sort((a, b) => b[1].pub.created - a[1].pub.created)
            .slice(0, 50)
            .map(([code, r]) => ({ room: code, nick: r.pub.nick, rating: r.pub.rating, min: r.pub.min, inc: r.pub.inc, pass: !!r.pub.hash }));
        sendJson(res, 200, list);
        return;
    }
    if (url.pathname === '/lobby/create' && req.method === 'POST') {
        readJson(req, async j => {
            if (Object.keys(rooms).length > 500) { sendJson(res, 503, {}); return; }
            const pass = typeof j.pass === 'string' ? j.pass.slice(0, 20) : '';
            let nick = '', rating = 0;
            if (typeof j.token === 'string' && j.token.length > 20 && j.token.length < 4096) {
                const uid = await sbUser(j.token);
                const prof = uid ? await sbProfile(uid) : null;
                if (prof) { nick = String(prof.nick || '').slice(0, 16); }
            }
            const code = makeCode();
            const r = rooms[code] = makeRoom();
            const salt = crypto.randomBytes(8).toString('hex');
            r.pub = { nick, rating, min: Math.max(0, Math.min(180, j.min | 0)), inc: Math.max(0, Math.min(60, j.inc | 0)), created: Date.now(), salt, hash: pass ? hashPw(pass, salt) : null };
            setTimeout(() => { const x = rooms[code]; if (x && !x.host) delete rooms[code]; }, 60000);   // хозяин так и не подключился
            sendJson(res, 200, { room: code });
        });
        return;
    }
    if (url.pathname === '/lobby/join' && req.method === 'POST') {
        readJson(req, j => {
            const code = String(j.room || '').toUpperCase().slice(0, 12);
            const r = rooms[code];
            if (!r || !r.pub || !r.host || r.guest) { sendJson(res, 404, { error: 'gone' }); return; }
            if (Date.now() < r.lockUntil) { sendJson(res, 429, { error: 'locked' }); return; }
            if (r.pub.hash) {
                let ok = false;
                try { ok = crypto.timingSafeEqual(hashPw(String(j.pw || '').slice(0, 20), r.pub.salt), r.pub.hash); } catch (e) { }
                if (!ok) {
                    if (++r.failN >= 8) { r.failN = 0; r.lockUntil = Date.now() + 60000; }
                    sendJson(res, 403, { error: 'pass' });
                    return;
                }
            }
            const ticket = crypto.randomBytes(12).toString('hex');
            r.tickets.add(ticket);
            setTimeout(() => r.tickets.delete(ticket), 30000);
            sendJson(res, 200, { ticket });
        });
        return;
    }

    if (url.pathname === '/events') {
        if (role !== 'host' && role !== 'guest') { res.writeHead(400); res.end(); return; }
        const sid = (url.searchParams.get('sid') || '').slice(0, 24);
        const lastId = parseInt(req.headers['last-event-id'] || '0', 10) || 0;
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
        res.write('retry: 1500\n: ok\n\n');
        let r = rooms[room];
        if (role === 'host') {
            if (r && r.sid.host && r.sid.host !== sid) { push(res, { t: '__taken' }); res.end(); return; }
            if (!r) { push(res, { t: '__nohost' }); res.end(); return; }          // комнаты создаются только через список комнат или быстрый поиск
        } else {
            if (!r || (r.sid.guest && r.sid.guest !== sid)) { push(res, { t: '__nohost' }); res.end(); return; }
            if (r.pub && r.pub.hash && r.sid.guest !== sid) {           // комната с паролем: нужен билет, выданный после проверки пароля
                const tk = url.searchParams.get('ticket') || '';
                if (!r.tickets.has(tk)) { push(res, { t: '__badpass' }); res.end(); return; }
                r.tickets.delete(tk);
            }
        }
        const old = r[role];
        if (old && old !== res) { try { old.end(); } catch (e) { } }
        clearTimeout(r.timer[role]);
        r[role] = res;
        r.sid[role] = sid;
        r.log[role].filter(e => e.id > lastId).forEach(e => res.write('id: ' + e.id + '\ndata: ' + e.data + '\n\n'));   // пропущенное
        if (r.host && r.guest && !r.opened) { r.opened = true; open(r); }
        const beat = setInterval(() => res.write(': ping\n\n'), 15000);
        req.on('close', () => {
            clearInterval(beat);
            if (r[role] !== res) return;        // уже заменено новым подключением
            r[role] = null;
            r.timer[role] = setTimeout(() => {  // даём время переподключиться
                if (r[role] || rooms[room] !== r) return;
                r.sid[role] = null; r.user[role] = null; r.peer[role] = null;
                const o = other(role);
                if (r[o]) push(r[o], { t: '__close' });
                if (role === 'host' || (!r.host && !r.guest)) { delete rooms[room]; unwait(room); }
                else r.opened = false;
            }, GRACE);
        });
        return;
    }

    if (url.pathname === '/send' && req.method === 'POST') {
        const mid = parseInt(url.searchParams.get('mid') || '0', 10) || 0;
        let body = '';
        req.on('data', d => { body += d; if (body.length > 1e6) req.destroy(); });
        req.on('end', () => {
            const r = rooms[room];
            if (r && (role === 'host' || role === 'guest')) {
                if (mid && mid <= r.lastMid[role]) { res.end('ok'); return; }   // повторная отправка того же сообщения
                if (mid) r.lastMid[role] = mid;
                let msg = null;
                try { msg = JSON.parse(body); } catch (e) { }
                if (msg && msg.t === 'auth') handleAuth(room, r, role, msg.token);
                else if (msg && msg.t === 'result') handleResult(r, role, msg.res, msg);
                else {
                    if (msg && msg.t === 'start' && role === 'host') { r.gid = room + '-' + msg.seed; r.rep = { host: null, guest: null }; r.meta = null; r.rated = !!r.quickMode; r.incv = Math.max(0, Math.min(60, msg.inc | 0)); r.inlog = msg.custom ? null : []; r.seed = msg.seed | 0; r.tcv = msg.tc | 0; const hh = msg.heroes || {}; r.heroes = { w: String(hh.w || '').slice(0, 20), b: String(hh.b || '').slice(0, 20) }; clearTimeout(r.repTimer); }
                    if (msg && msg.t === 'in' && r.inlog) {          // все действия игроков по порядку: из них собирается повтор партии
                        if (r.inlog.length >= 5000 || !msg.m || JSON.stringify(msg.m).length > 300) r.inlog = null;
                        else r.inlog.push(msg.m);
                    }
                    if (msg && msg.t === 'chat' && typeof msg.text === 'string') {      // последние сообщения нужны только для жалоб
                        r.chatLog.push({ from: role, text: msg.text.slice(0, 300) });
                        if (r.chatLog.length > 40) r.chatLog.shift();
                    }
                    deliver(r, other(role), body.replace(/\n/g, ' '));
                }
            }
            res.end('ok');
        });
        return;
    }

    // обычные файлы игры
    let file = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    file = path.normalize(path.join(ROOT, file));
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    // На Linux-хостингах (Render и т. п.) регистр в именах файлов важен, а на Windows нет: ищем файл без учёта регистра
    const findCI = full => {
        if (fs.existsSync(full)) return full;
        let cur = ROOT;
        for (const part of path.relative(ROOT, full).split(path.sep)) {
            let next = path.join(cur, part);
            if (!fs.existsSync(next)) {
                let list = [];
                try { list = fs.readdirSync(cur); } catch (e) { return null; }
                const hit = list.find(n => n.toLowerCase() === part.toLowerCase());
                if (!hit) return null;
                next = path.join(cur, hit);
            }
            cur = next;
        }
        return cur;
    };
    file = findCI(file) || file;
    fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Не найдено: ' + url.pathname); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        res.end(data);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('==============================================');
    console.log(' SpellsChess: сервер запущен');
    console.log('==============================================');
    console.log(' Вы (хозяин) открываете в браузере:  http://localhost:' + PORT);
    console.log('');
    console.log(' Другу дайте один из этих адресов:');
    Object.values(os.networkInterfaces()).flat().filter(i => i.family === 'IPv4' && !i.internal).forEach(i => {
        console.log('   http://' + i.address + ':' + PORT + (i.address.startsWith('26.') ? '   <- это адрес Radmin VPN' : ''));
    });
    console.log('');
    console.log(' Секретный ключ Supabase: ' + (SUPA_SECRET ? 'задан' : 'НЕ ЗАДАН (рейтинг не будет меняться)'));
    console.log(' Не закрывайте это окно, пока играете.');
});