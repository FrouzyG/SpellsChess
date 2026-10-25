// SpellsChess: мини-сервер. Раздаёт файлы игры и передаёт ходы между двумя игроками.
// Запуск: node server.js   (или двойной клик по start.bat)
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.ico': 'image/x-icon' };
const rooms = {};   // код -> { host: res, guest: res }
let waiting = null; // код комнаты, где кто-то ждёт соперника («Быстрая игра»)

const other = role => (role === 'host' ? 'guest' : 'host');
const push = (res, obj) => { if (res) res.write('data: ' + JSON.stringify(obj) + '\n\n'); };
const makeCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
const open = r => { push(r.host, { t: '__open' }); push(r.guest, { t: '__open' }); };

const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const room = (url.searchParams.get('room') || '').toUpperCase().slice(0, 12);
    const role = url.searchParams.get('role');

    if (url.pathname === '/ping') { res.end('spellschess'); return; }

    // «Быстрая игра»: первый ждёт, второй автоматически подключается к нему
    if (url.pathname === '/quick') {
        res.setHeader('Content-Type', 'application/json');
        const w = waiting && rooms[waiting];
        if (w && !w.guest) {
            const code = waiting;
            waiting = null;
            res.end(JSON.stringify({ room: code, role: 'guest' }));
            return;
        }
        if (Object.keys(rooms).length > 500) { res.statusCode = 503; res.end('{}'); return; }
        const code = makeCode();
        rooms[code] = { host: null, guest: null };
        waiting = code;
        setTimeout(() => {                       // если создатель так и не подключился
            const r = rooms[code];
            if (r && !r.host) { delete rooms[code]; if (waiting === code) waiting = null; }
        }, 60000);
        res.end(JSON.stringify({ room: code, role: 'host' }));
        return;
    }

    if (url.pathname === '/events') {
        if (role !== 'host' && role !== 'guest') { res.writeHead(400); res.end(); return; }
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
        res.write(': ok\n\n');
        let r = rooms[room];
        if (role === 'host') {
            if (r && r.host) { push(res, { t: '__taken' }); res.end(); return; }
            if (!r) { if (Object.keys(rooms).length > 500) { res.end(); return; } r = rooms[room] = { host: null, guest: null }; }
            r.host = res;
            if (r.guest) open(r);
        } else {
            if (!r || r.guest) { push(res, { t: '__nohost' }); res.end(); return; }
            r.guest = res;
            if (r.host) open(r);
        }
        const beat = setInterval(() => res.write(': ping\n\n'), 15000);
        req.on('close', () => {
            clearInterval(beat);
            const cur = rooms[room];
            if (!cur || cur[role] !== res) return;
            cur[role] = null;
            push(cur[other(role)], { t: '__close' });
            if (role === 'host' || (!cur.host && !cur.guest)) { delete rooms[room]; if (waiting === room) waiting = null; }
        });
        return;
    }

    if (url.pathname === '/send' && req.method === 'POST') {
        let body = '';
        req.on('data', d => { body += d; if (body.length > 1e6) req.destroy(); });
        req.on('end', () => {
            const r = rooms[room];
            if (r && r[other(role)]) r[other(role)].write('data: ' + body.replace(/\n/g, ' ') + '\n\n');
            res.end('ok');
        });
        return;
    }

    // обычные файлы игры
    let file = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    file = path.normalize(path.join(ROOT, file));
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('Не найдено'); return; }
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
    console.log(' Не закрывайте это окно, пока играете.');
});