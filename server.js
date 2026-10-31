// SpellsChess: мини-сервер. Раздаёт файлы игры и передаёт ходы между двумя игроками.
// Запуск: node server.js   (или двойной клик по start.bat)
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.ico': 'image/x-icon' };
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
const makeRoom = () => ({ inlog: null, seed: null, tcv: null, rated: true, user: { host: null, guest: null }, peer: { host: null, guest: null }, rep: { host: null, guest: null }, heroes: null, meta: null, gid: null, recorded: null, repTimer: null, host: null, guest: null, sid: { host: null, guest: null }, log: { host: [], guest: [] }, seq: { host: 0, guest: 0 }, lastMid: { host: 0, guest: 0 }, timer: {}, opened: false });
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
        const r = await fetch(`${SUPA_URL}/rest/v1/profiles?id=eq.${uid}&select=nick,rating`, { headers: { apikey: SUPA_PUB }, signal: sbSignal() });
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
        if (uid && prof) { r.user[role] = { id: uid }; info = { nick: String(prof.nick || '').slice(0, 16), rating: prof.rating | 0, id: uid }; }
    }
    if (rooms[room] !== r) return;
    r.peer[role] = info;
    console.log('вход:', room, role, info.nick ? 'игрок ' + info.nick : 'гость');
    deliver(r, o, JSON.stringify({ t: 'peer', nick: info.nick, rating: info.rating, id: info.id }));
    if (r.peer[o]) deliver(r, role, JSON.stringify({ t: 'peer', nick: r.peer[o].nick, rating: r.peer[o].rating, id: r.peer[o].id }));
}
// Результат партии: оба игрока сообщают итог, записываем, если оба вошли в аккаунт и их сообщения совпали.
function recordGame(r) {
    if (!r.gid || r.recorded === r.gid) return;
    if (!SUPA_SECRET) { console.log('результат НЕ записан: в Render не задана переменная SUPABASE_SECRET_KEY'); return; }
    if (!r.user.host || !r.user.guest) return;
    const res = r.rep.host || r.rep.guest;
    r.recorded = r.gid;
    const headers = { apikey: SUPA_SECRET, 'Content-Type': 'application/json' };
    if (!SUPA_SECRET.startsWith('sb_')) headers.Authorization = 'Bearer ' + SUPA_SECRET;
    fetch(SUPA_URL + '/rest/v1/rpc/record_result', {
        method: 'POST', headers, signal: sbSignal(),
        body: JSON.stringify({ p_game: r.gid, p_white: r.user.host.id, p_black: r.user.guest.id, p_result: res, p_wh: r.heroes ? r.heroes.w : null, p_bh: r.heroes ? r.heroes.b : null, p_reason: r.meta ? r.meta.reason : null, p_moves: r.meta ? r.meta.moves : null, p_rated: r.rated !== false, p_seed: r.inlog ? r.seed : null, p_tc: r.tcv, p_log: r.inlog })
    }).then(x => { if (!x.ok) x.text().then(t => console.log('record_result: ОШИБКА', x.status, t)); else console.log('результат записан:', r.gid, res); })
        .catch(e => console.log('record_result: сбой', e.message));
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

const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const room = (url.searchParams.get('room') || '').toUpperCase().slice(0, 12);
    const role = url.searchParams.get('role');

    if (url.pathname === '/ping') { res.end('spellschess'); return; }

    // «Быстрая игра»: первый ждёт, второй автоматически подключается к нему
    if (url.pathname === '/quick') {
        res.setHeader('Content-Type', 'application/json');
        const tc = (url.searchParams.get('tc') || 'any').slice(0, 6);
        const rated = url.searchParams.get('rated') !== '0';     // дружеские и рейтинговые ищут друг друга отдельно
        // ищем ожидающего, чьё время подходит: одинаковое, либо кто-то из двоих согласен на любое
        const idx = waitList.findIndex(w => rooms[w.code] && !rooms[w.code].guest && w.rated === rated && (w.tc === tc || w.tc === 'any' || tc === 'any'));
        if (idx >= 0) {
            const code = waitList[idx].code;
            waitList.splice(idx, 1);
            res.end(JSON.stringify({ room: code, role: 'guest' }));
            return;
        }
        if (Object.keys(rooms).length > 500) { res.statusCode = 503; res.end('{}'); return; }
        const code = makeCode();
        rooms[code] = makeRoom();
        waitList.push({ code, tc, rated });
        setTimeout(() => {                       // если создатель так и не подключился
            const r = rooms[code];
            if (r && !r.host) { delete rooms[code]; unwait(code); }
        }, 60000);
        res.end(JSON.stringify({ room: code, role: 'host' }));
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
            if (!r) { if (Object.keys(rooms).length > 500) { res.end(); return; } r = rooms[room] = makeRoom(); }
        } else {
            if (!r || (r.sid.guest && r.sid.guest !== sid)) { push(res, { t: '__nohost' }); res.end(); return; }
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
                    if (msg && msg.t === 'start' && role === 'host') { r.gid = room + '-' + msg.seed; r.rep = { host: null, guest: null }; r.meta = null; r.rated = msg.rated !== false; r.inlog = []; r.seed = msg.seed | 0; r.tcv = msg.tc | 0; const hh = msg.heroes || {}; r.heroes = { w: String(hh.w || '').slice(0, 20), b: String(hh.b || '').slice(0, 20) }; clearTimeout(r.repTimer); }
                    if (msg && msg.t === 'in' && r.inlog) {          // все действия игроков по порядку: из них собирается повтор партии
                        if (r.inlog.length >= 5000 || !msg.m || JSON.stringify(msg.m).length > 300) r.inlog = null;
                        else r.inlog.push(msg.m);
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