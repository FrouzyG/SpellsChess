'use strict';

/* =====================================================================
   НАСТРОЙКИ — можно смело менять числа
   ===================================================================== */
// ---------- Об авторе и поддержка проекта ----------
// Вставьте сюда ссылку на вашу страницу доната (Ko-fi, Boosty, DonationAlerts, Buy Me a Coffee и т. п.).
// Пока строка пустая, кнопка «Поддержать» скрыта.
const DONATE_URL = 'https://boosty.to/frouzyg';

const CONFIG = {
    // Перезарядка способностей (в ходах владельца)
    cooldown: {
        resurrect: 11, shield: 5, rescue: 9,         // Паладин
        fireball: 7, freeze: 5, copy: 15,            // Маг
        illusion: 3, hypnosis: 8, confusion: 7,      // Экстрасенс
        raise: 8, frankenstein: 3, apocalypse: 8,    // Некромант
        trap: 4, arrow: 4, lure: 7,                  // Охотник
        aim: 3,                                      // пассивка Охотника «Меткий глаз»
        conveyor: 5, portals: 8, relocate: 2,        // Архитектор
        shomen: 9, fukashi: 7, fenyan: 6,            // Самурай
        teleport: 10,                                // пассивка Самурая «Кагэватари»
        phase: 4, soulmates: 7, scream: 4,           // Призрак
        zawarudo: 10, misclick: 12, superposition: 6,  // Повелитель времени
        groundhog: 6,                                // Ход сурка
        timeslow: 4,                                 // пассивка Повелителя времени
        guardian: 5, purify: 10, lie: 10, virus: 3,  // новые способности
        vine: 7, ritual: 5, bumpuku: 3, generator: 7,
        blunder: 7, banana: 7, jaws: 8, tomato: 4        // Шут
    },
    startCooldown: 3,        // с какой перезарядкой стартуют все способности в начале партии
    scaredPawnTurns: 3,      // сколько ходов своей стороны пешка остаётся напуганной (если не сходит раньше)
    timePassiveCostsTurn: false,   // true: пассивка Повелителя времени тратит ход
    guardianTurns: 5,        // Ангел-хранитель: сколько ходов держится самоотверженность
    wardTurns: 3,            // Очищение: сколько ходов держится защита от магии
    capTurns: 3,             // Шут: сколько ходов ВРАГА держится шутовской колпак
    jawsTurns: 3,            // Шут: сколько своих ходов живут заводные челюсти
    tomatoTurns: 5,          // Шут: сколько ходов ВРАГА способность остаётся отключённой
    betrayAfter: 10,         // Шут: после какого по счёту хода ВРАГА можно ходить предательской фигурой
    bumpukuTurns: 2,         // Бумпуку: на каком своём ходу взрывается бомба
    hogOnce: true,           // Ход сурка: true — ловушка стоит вечно, но срабатывает один раз и исчезает; false — срабатывает на каждую новую фигуру
    vineTurns: 5,            // Лоза: сколько ходов владельца она стоит
    freezeTurns: 3,   // сколько ходов замороженного игрока фигура стоит на месте
    hypnoTurns: 2,    // сколько ходов экстрасенса фигура ему подчиняется
    burnTurns: 3,     // сколько ходов Мага (считаются только его ходы) горит клетка после огненного шара
    shieldTurns: 3,   // сколько ходов Паладина (считаются только его ходы) держится щит
    arrowRange: 6,    // стрела: насколько далеко от короля можно целиться (6 = не дальше противоположного края)
    fireRange: 6,     // огненный шар Мага: то же ограничение дальности от короля
    // пассивка Охотника «Меткий глаз»: квадрат 3×3 вокруг короля + 4 клетки на расстоянии 2 по горизонтали и вертикали (крест)
    sound: true
};

/* =====================================================================
   ДАННЫЕ
   ===================================================================== */
const GLYPH = { k: '♚\uFE0E', q: '♛\uFE0E', r: '♜\uFE0E', b: '♝\uFE0E', n: '♞\uFE0E', p: '♟\uFE0E' };
const pImg = (c, t) => `<i class="pi ${c} t-${t}">${GLYPH[t]}</i>`;   // мини-фигура (картинка, а без папки pieces обычный символ)
const SYM = { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' };
GLYPH.j = '🦷'; SYM.j = '🦷';      // заводные челюсти Шута

const ABILITIES = {
    // --- Паладин
    resurrect: {
        icon: '✨', name: 'Воскрешение',
        desc: 'Возвращает вашу фигуру из сброса на свободную клетку первой горизонтали (пешку на любую из первых четырёх).'
    },
    shield: {
        icon: '🛡️', name: 'Око за око',
        desc: 'На ' + CONFIG.shieldTurns + ' хода фигура получает шипы: срубивший её погибает.'
    },
    rescue: {
        icon: '🪂', name: 'Спасение',
        desc: 'Переносит вашу фигуру с вражеской половины на свободную клетку первой горизонтали (пешку на 2–4).'
    },
    // --- Маг
    fireball: {
        icon: '🔥', name: 'Огненный шар',
        desc: 'Метка в радиусе 6 от короля. В начале вашего хода взрыв, затем клетка горит 3 хода: вставшие на неё и прошедшие сквозь фигуры сгорают (конь перепрыгивает). Уничтожает плитки.'
    },
    freeze: {
        icon: '❄️', name: 'Заморозка',
        desc: 'Любая фигура (кроме короля) на ' + CONFIG.freezeTurns + ' хода не ходит, её нельзя срубить, и магия на неё не действует. Исключение: огненный шар.'
    },
    copy: {
        icon: '🪞', name: 'Зеркало',
        desc: 'Повторяет последнюю способность врага.'
    },
    // --- Экстрасенс
    illusion: {
        icon: '🎭', name: 'Иллюзия',
        desc: 'Создаёт двойника фигуры. Они ходят только вместе, двойник никого не рубит и рассеивается, если ему или оригиналу что-то грозит.'
    },
    hypnosis: {
        icon: '🌀', name: 'Гипноз',
        desc: 'Вражеская фигура в радиусе 3×3 от вашей фигуры ходит за вас ' + CONFIG.hypnoTurns + ' ваших хода или пока не срубит фигуру. Короля нельзя.'
    },
    confusion: {
        icon: '💫', name: 'Замешательство',
        desc: 'Вражеская фигура (не король) делает два хода подряд по вашему выбору, без рубки.'
    },
    // --- Некромант
    raise: {
        icon: '🧟', name: 'Зомби',
        desc: 'Поднимает фигуру из любого сброса зомби на свободную клетку первой горизонтали (пешку на любую из первых четырёх).'
    },
    frankenstein: {
        icon: '🧪', name: 'Франкенштейн',
        desc: 'Фигура рубит свою фигуру и получает её ходы.'
    },
    apocalypse: {
        free: true,
        icon: '☠️', name: 'Апокалипсис',
        desc: 'Дополнительный ход любым зомби (даже вражеским: он рубит своих), без обязательной рубки. Потом обычный ход.'
    },
    // --- Призрак
    phase: {
        icon: '👻', name: 'Прозрачность',
        desc: 'Фигура становится прозрачной для ваших фигур: они проходят сквозь неё, но не встают.'
    },
    soulmates: {
        icon: '🔗', name: 'Соулмейты',
        desc: 'Связывает две фигуры: когда одна погибает, все связанные фигуры в радиусе 3×3 от неё гибнут тоже.'
    },
    scream: {
        icon: '😱', name: 'Скример',
        desc: 'Дальность хода вражеской фигуры (не короля) становится 1: ладья по прямым, слон по диагонали, ферзь в любую сторону, конь как слон. Пешка идёт только на 1 вперёд и не рубит. Страх спадает после хода, у пешки и через ' + CONFIG.scaredPawnTurns + ' хода.'
    },
    // --- Самурай
    shomen: {
        icon: '⚔️', name: 'Сёмен-ути',
        desc: 'Недоступен до первой смерти. Отмечает вертикаль: в начале вашего хода все фигуры на ней погибают.'
    },
    fukashi: {
        icon: '🥷', name: 'Фукаши',
        desc: 'Фигура невидима для врага, но блокирует ходы: пройти сквозь неё значит срубить её. Раскрывается, если срубила, дала шах или ей грозит пешка (по диагонали). Если пешка идёт прямо на неё или фигура, которую она связывает, пытается сойти с линии, невидимка раскрывается, а ход не тратится.'
    },
    fenyan: {
        free: true,
        icon: '🗡️', name: 'Фен-Янь',
        desc: 'Все клетки одного цвета острые на ваш ход и ход врага: вставшая на острую клетку фигура погибает. Клетки, на которых в момент применения стоят фигуры, острыми не становятся.'
    },
    // --- Архитектор
    conveyor: {
        icon: '🏭', name: 'Конвейер',
        desc: 'Плитка толкает фигуру на себе (и колонну перед ней) на клетку вперёд в конце каждого хода.'
    },
    portals: {
        icon: '🌀', name: 'Порталы',
        desc: 'Две связанные плитки: ход через портал продолжается из второго, вставшая фигура переносится на второй. Одновременно две пары.'
    },
    relocate: {
        icon: '🧭', name: 'Перемещение',
        desc: 'Переносит любую плитку или портал на свободную клетку.'
    },
    // --- Охотник
    trap: {
        icon: '🪤', name: 'Капкан',
        desc: 'Невидимый капкан: вставшая на него фигура (не король) пропускает следующий ход.'
    },
    arrow: {
        icon: '🏹', name: 'Стрела',
        desc: 'Метка в радиусе 6 от короля: в начале вашего хода стрела убивает фигуру на ней.'
    },
    // --- Новые способности
    guardian: {
        icon: '👼', name: 'Ангел-хранитель',
        desc: 'На ' + CONFIG.guardianTurns + ' ходов союзная фигура самоотверженна: если рядом (3×3) другую союзную фигуру убивают (рубкой, огненным шаром, стрелой, взрывом и т. п.), она меняется с ней местами и гибнет вместо неё.'
    },
    purify: {
        icon: '✴️', name: 'Очищение',
        desc: 'Снимает с любой фигуры все эффекты (баффы и дебаффы) и на ' + CONFIG.wardTurns + ' хода даёт защиту от магии.'
    },
    lie: {
        icon: '🤥', name: 'Ход — это ложь',
        desc: 'Выберите клетку, куда встанет невидимая фигура, и клетку её иллюзии (оба хода обычные ходы фигуры). Невидимость и иллюзия раскрываются и рассеиваются по обычным правилам, ошибки игрока на его совести. После хода врага правда раскрывается.'
    },
    virus: {
        icon: '☣️', name: 'Вирус',
        desc: 'Заражённая плитка: вставшая на неё фигура (не король) становится зомби.'
    },
    vine: {
        icon: '🌿', name: 'Лоза',
        desc: 'Лоза блокирует путь дальше себя. Исчезает, когда на неё встаёт фигура, или через ' + CONFIG.vineTurns + ' ваших хода.'
    },
    ritual: {
        free: true,
        icon: '🕯️', name: 'Ритуал',
        desc: 'Призрачная плитка: стоящая на ней фигура (своя или вражеская) прозрачна для ваших фигур. Сквозь вражескую фигуру на ней можно пройти и можно её срубить.'
    },
    bumpuku: {
        free: true,
        icon: '💣', name: 'Бумпуку',
        desc: 'Бомба на союзной фигуре (не короле) взрывается на вашем ' + CONFIG.bumpukuTurns + '-м ходе после применения и убивает всех в 3×3. Срубленная фигура не взрывается. Ход не тратится.'
    },
    generator: {
        icon: '⚡', name: 'Генератор',
        desc: 'Плитки плюс и минус. Все плюсы связаны со всеми минусами: если фигуры стоят и на плюсе, и на минусе, их убивает разряд.'
    },
    groundhog: {
        free: true,
        icon: '⏳', name: 'Ход сурка',
        desc: 'Ловушка (королю не страшна) стоит, пока не сработает один раз: фигура на ней возвращается туда, откуда пришла. На пустой клетке скрыта и ход не тратит, на фигуре видна, тратит ход и срабатывает на новую фигуру.'
    },
    // --- Повелитель времени
    zawarudo: {
        free: true,
        icon: '🕰️', name: 'ZA WARUDO',
        desc: 'Два хода подряд, но первым ходом нельзя ни шаховать, ни рубить.'
    },
    misclick: {
        free: true,
        icon: '⏪', name: 'Мисклик!',
        desc: 'Отменяет ход противника и ваш предыдущий ход.'
    },
    superposition: {
        icon: '⚛️', name: 'Суперпозиция',
        desc: 'Одноразово: фигура (не король) не мешает, если на её клетку встала или прошла сквозь неё другая фигура, и возвращается на клетку прошлого хода. Если вернуться нельзя, ничего не происходит. Если на клетку возврата встала ходившая фигура, её рубят.'
    },
    lure: {
        icon: '🎣', name: 'Приманка',
        desc: 'Приманка на вашей фигуре (видна всем): вражеская фигура (не король) обязана срубить её или встать на её клетку.'
    }
};

// ---- Шут ----
Object.assign(ABILITIES, {
    blunder: {
        icon: '🤡', name: 'Бриллиантовый зевок',
        desc: 'Шутовской колпак на вашу фигуру (враг не видит, на какую): ' + (CONFIG.capTurns - 1) + ' хода врага она не может рубить и создавать шахи. Срубивший её погибает, а колпак слетает. Перед третьим ходом врага колпак слетает сам: фигура снова создаёт угрозу, и её можно срубить.'
    },
    banana: {
        free: true,
        icon: '🍌', name: 'Банановая кожура',
        desc: 'Невидимая для врага кожура на свободной клетке с направлением (вверх, вниз, влево, вправо): вставшая на неё фигура (не король) поскальзывается и съезжает на соседнюю клетку в эту сторону, кожура исчезает. Ход не тратится.'
    },
    jaws: {
        icon: '🦷', name: 'Заводные челюсти',
        desc: 'Фигура на первых трёх горизонталях вашей стороны: ходит и рубит на 1 клетку по вертикали и горизонтали, живёт ' + CONFIG.jawsTurns + ' ваших хода. Её можно срубить.'
    },
    tomato: {
        free: true,
        icon: '🍅', name: 'Красная обструкция',
        desc: 'Помидор в одну из способностей врага: она отключается на ' + CONFIG.tomatoTurns + ' ходов врага (перезарядка идёт как обычно). Нельзя бросить в уже отключённую способность. Ход не тратится.'
    }
});

const PASSIVES = {
    brotherhood: {
        icon: '🤝', name: 'Братство',
        desc: 'Две пешки рядом на одной горизонтали нельзя срубить. Три и более подряд: эффекта нет.'
    },
    aura: {
        icon: '🧿', name: 'Магический барьер',
        desc: 'Ваши фигуры в радиусе 3×3 от короля неуязвимы для магии, их можно только срубить.'
    },
    doubleVision: {
        icon: '👀', name: 'Двоится в глазах',
        desc: 'Король, ушедший из-под шаха сам, оставляет иллюзию на другой клетке, куда мог уйти. Она появляется одновременно с ним и дальше ходит с королём как обычная.'
    },
    harvest: {
        icon: '🌾', name: 'Жатва',
        desc: 'Можно рубить свои пешки: это даёт дополнительный ход (при шахе доп. хода нет, зато перезарядка способностей −1).'
    },
    paranormal: {
        icon: '🌫️', name: 'Паранормальщина',
        desc: 'Король прозрачен для ваших фигур. Рядом с вашей фигурой он может «вселиться» в цепочку ваших фигур (каждая в 3×3 от предыдущей) и появиться на свободной клетке в 3×3 от любой из них.'
    },
    multi: {
        icon: '🧰', name: 'Мастер на все руки',
        desc: 'За ход можно применить несколько способностей, но после первой фигурой ходить нельзя. Потом «Завершить ход».'
    },
    teleport: {
        icon: '🌀', name: 'Кагэватари',
        desc: 'Король телепортируется на любое безопасное свободное поле, даже из-под шаха. Второй клик по королю или кнопка. Тратит ход.'
    },
    timeslow: {
        free: true,
        icon: '⌛', name: 'Замедление времени',
        desc: 'Второй клик по королю или кнопка, затем способность врага: её перезарядка +2 сейчас и +1 на всю партию, у остальных перезаряжающихся +1 сейчас. ' + (CONFIG.timePassiveCostsTurn ? 'Тратит ход.' : 'Ход не тратится.') + ''
    },
    aim: {
        free: true,
        icon: '🎯', name: 'Меткий глаз',
        desc: 'Второй клик по королю или кнопка: метка стрелы в радиусе 3 шагов вокруг короля (шаг: на клетку вверх, вниз или вбок). Ход не тратится.'
    }
};

PASSIVES.pretense = {
    icon: '🃏', name: 'Притворство',
    desc: 'В начале партии тайно выберите вражеского слона или коня: Предательство. Враг ходит ею как обычно. После ' + CONFIG.betrayAfter + '-го хода врага можно потратить ход и дважды нажать на неё: она навсегда сменит цвет и будет подчиняться только вам (в этот ход сама не ходит).'
};

const HEROES = {
    paladin: { icon: '⚜️', name: 'Паладин', tag: 'Защита и святость', passive: 'brotherhood', abilities: ['resurrect', 'shield', 'rescue', 'guardian'] },
    mage: { icon: '🔮', name: 'Маг', tag: 'Классика', passive: 'aura', abilities: ['fireball', 'freeze', 'copy', 'purify'] },
    hypnotist: { icon: '🌀', name: 'Экстрасенс', tag: 'Обман и контроль', passive: 'doubleVision', abilities: ['illusion', 'hypnosis', 'confusion', 'lie'] },
    necromancer: { icon: '💀', name: 'Некромант', tag: 'Смерть и сшивка', passive: 'harvest', abilities: ['raise', 'frankenstein', 'apocalypse', 'virus'] },
    hunter: { icon: '🏹', name: 'Охотник', tag: 'Ловушки и добыча', passive: 'aim', abilities: ['trap', 'arrow', 'lure', 'vine'] },
    phantom: { icon: '👻', name: 'Призрак', tag: 'Проклятия и скорость', passive: 'paranormal', abilities: ['phase', 'soulmates', 'scream', 'ritual'] },
    samurai: { icon: '🗡️', name: 'Самурай', tag: 'Всё ради победы', passive: 'teleport', abilities: ['shomen', 'fukashi', 'fenyan', 'bumpuku'] },
    architect: { icon: '🏗️', name: 'Архитектор', tag: 'Перестройка по своим правилам', passive: 'multi', abilities: ['conveyor', 'portals', 'relocate', 'generator'] },
    timelord: { icon: '⏳', name: 'Повелитель времени', tag: 'Похититель темпа', passive: 'timeslow', abilities: ['zawarudo', 'misclick', 'superposition', 'groundhog'] }
};

HEROES.jester = { icon: '🤡', name: 'Шут', tag: 'Трюки и сюрпризы', passive: 'pretense', abilities: ['blunder', 'banana', 'jaws', 'tomato'] };

// Способности, у которых выбор идёт в два шага: сначала фигура, потом клетка
const ACTIVE_PASSIVES = ['aim', 'teleport', 'timeslow'];
const NO_TARGET = ['zawarudo', 'misclick'];   // способности без выбора цели: срабатывают сразу по кнопке   // пассивки, у которых есть кнопка и перезарядка
const STAGED = ['lie', 'generator', 'illusion', 'frankenstein', 'rescue', 'confusion', 'apocalypse', 'conveyor', 'portals', 'relocate', 'soulmates', 'banana'];

const other = c => (c === 'w' ? 'b' : 'w');
const inb = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const sqName = (r, c) => 'abcdefgh'[c] + (8 - r);
const colorName = c => (c === 'w' ? 'Белые' : 'Чёрные');
const cloneBoard = b => b.map(row => row.map(p => (p ? { ...p } : null)));
const mk = (t, c) => ({ t, c, moved: false, shield: false, frozen: 0 });
const uidOf = p => (p.uid || (p.uid = G.nextUid++));
const cdOf = (col, k) => CONFIG.cooldown[k] + ((G.cdBonus && G.cdBonus[col] && G.cdBonus[col][k]) || 0);
let HIST = [];
// Общий генератор случайных чисел (одинаковый у обоих игроков онлайн): влияет только на порядок строк в журнале
let _seed = 1;
const rnd = () => { _seed = (_seed + 0x6D2B79F5) | 0; let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // снимки состояния в начале каждого хода (для способности «Мисклик!»)
const $ = s => document.querySelector(s);

// Все способы ходить у фигуры: основной + «пришитые» (Франкенштейн)
const moveTypes = p => [p.t, ...(p.x || [])];
const pieceSym = p => SYM[p.t] + (p.x && p.x.length ? '+' + p.x.map(t => SYM[t]).join('+') : '');
const descKey = d => d.t + (d.x || []).join('');
const sameMove = (a, b) => a.fr === b.fr && a.fc === b.fc && a.tr === b.tr && a.tc === b.tc;

/* =====================================================================
   ОНЛАЙН: обе стороны получают одни и те же действия и считают игру одинаково.
   Скрытое (капканы, невидимые фигуры, ловушки сурка) просто не рисуется у соперника.
   ===================================================================== */
const NET = { on: false, me: null, host: false, conn: null, peer: null, lost: false, ready: false, oppReady: false, oppHero: null, muted: false };
let pickOverride = null, lastPick = null;    // выбор «рокировка или вселение» передаётся сопернику
const netSend = m => { if (NET.on && NET.conn && NET.conn.open) NET.conn.send(m); };
const isActor = () => !NET.on || (!!G && G.turn === NET.me);   // можно ли этому игроку сейчас ходить

let showGhosts = true;   // подсвечивать иллюзии (для честной игры за одним экраном можно выключить)
let showTraps = true;
let showInvis = true;    // показывать невидимые фигуры Самурая    // показывать капканы Охотника (так же)

function plural(n) {
    const a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return 'ход';
    if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return 'хода';
    return 'ходов';
}
const abilityDesc = k => ABILITIES[k].desc;
const cdBadgeHTML = n => (n > 0 ? `<span class="cd-badge">⏳${n}</span>` : '');

/* =====================================================================
   ЗВУК (простые тона, без файлов)
   ===================================================================== */
let actx = null;
function tone(f, d, type = 'sine', v = 0.06, delay = 0) {
    if (!CONFIG.sound) return;
    try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        const o = actx.createOscillator(), g = actx.createGain();
        const t = actx.currentTime + delay;
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(v, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(actx.destination);
        o.start(t); o.stop(t + d);
    } catch (e) { /* звук не критичен */ }
}
const SFX = {
    move: () => tone(300, 0.08, 'triangle'),
    capture: () => { tone(180, 0.12, 'square', 0.05); tone(110, 0.16, 'square', 0.05, 0.05); },
    boom: () => { tone(90, 0.5, 'sawtooth', 0.09); tone(55, 0.6, 'square', 0.08, 0.05); },
    freeze: () => [900, 1200, 1500, 1900].forEach((f, i) => tone(f, 0.18, 'sine', 0.04, i * 0.06)),
    revive: () => [400, 500, 650, 800, 1000].forEach((f, i) => tone(f, 0.25, 'sine', 0.05, i * 0.08)),
    shield: () => { tone(600, 0.12, 'triangle', 0.06); tone(900, 0.2, 'triangle', 0.05, 0.08); },
    thorn: () => { tone(220, 0.1, 'sawtooth', 0.06); tone(140, 0.25, 'sawtooth', 0.06, 0.08); },
    cast: () => { tone(200, 0.3, 'sawtooth', 0.05); tone(420, 0.3, 'triangle', 0.05, 0.1); },
    illusion: () => [700, 880, 1100].forEach((f, i) => tone(f, 0.2, 'triangle', 0.04, i * 0.05)),
    poof: () => { tone(500, 0.2, 'sine', 0.04); tone(250, 0.25, 'sine', 0.04, 0.08); },
    hypno: () => [300, 450, 300, 450].forEach((f, i) => tone(f, 0.18, 'sine', 0.05, i * 0.12)),
    raise: () => { tone(70, 0.5, 'sawtooth', 0.07); tone(110, 0.4, 'square', 0.04, 0.2); },
    zap: () => { tone(1200, 0.06, 'square', 0.05); tone(400, 0.15, 'sawtooth', 0.06, 0.05); tone(900, 0.08, 'square', 0.05, 0.12); },
    arrow: () => { tone(1500, 0.05, 'square', 0.04); tone(600, 0.18, 'triangle', 0.06, 0.04); },
    trap: () => { tone(160, 0.08, 'square', 0.07); tone(90, 0.2, 'square', 0.07, 0.06); },
    rewind: () => [900, 700, 500, 350].forEach((f, i) => tone(f, 0.14, 'triangle', 0.05, i * 0.07)),
    harvest: () => { tone(250, 0.1, 'triangle', 0.05); tone(330, 0.12, 'triangle', 0.05, 0.07); tone(420, 0.16, 'triangle', 0.05, 0.14); }
};
const sfx = k => SFX[k] && SFX[k]();

/* =====================================================================
   ШАХМАТНАЯ ЛОГИКА
   ===================================================================== */
const KN = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const KG = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function initialBoard() {
    const b = Array.from({ length: 8 }, () => Array(8).fill(null));
    const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    for (let c = 0; c < 8; c++) {
        b[0][c] = mk(back[c], 'b');
        b[1][c] = mk('p', 'b');
        b[6][c] = mk('p', 'w');
        b[7][c] = mk(back[c], 'w');
    }
    return b;
}

// Клетки, до которых «достаёт» фигура типа tp (конь или слайдер).
// Луч идёт до первой настоящей фигуры включительно; иллюзии прозрачны.
// Прозрачная для своих фигура: сквозь неё проходят фигуры того же цвета (король Призрака прозрачен всегда)
const isPhase = t => !!t && !t.ghost && (t.phase || (t.t === 'k' && G.hero[t.c] === 'phantom'));

// Фигура в суперпозиции «открыта»: ей есть куда вернуться, значит она не мешает и не гибнет
const vineAt = (r, c) => G.vines.some(v => v.r === r && v.c === c);
const ritualAt = (r, c) => G.rituals.find(x => x.r === r && x.c === c);
// Можно ли пройти сквозь фигуру t на клетке (r, c) фигурой цвета col: прозрачность или призрачная плитка Ритуала
const passThru = (t, col, r, c) => !!t && !t.ghost && ((t.c === col && isPhase(t)) || (!!ritualAt(r, c) && ritualAt(r, c).owner === col));
const supOpen = (b, t) => !!t && !!t.sup && !t.ghost && !!t.prev && !b[t.prev[0]][t.prev[1]];
const scaredDirs = tp => ((tp === 'r' || tp === 'j') ? ORTH : (tp === 'n' || tp === 'b') ? DIAG : [...DIAG, ...ORTH]);

// Выход из портала: если на клетке портал, возвращает клетку его пары
function portalExit(r, c) {
    const pt = G.portals.find(x => x.r === r && x.c === c);
    if (!pt) return null;
    const o = G.portals.find(x => x.id === pt.id && !(x.r === r && x.c === c));
    return o ? [o.r, o.c] : null;
}

// Идёт по лучу, проходя через порталы. cb(r, c, фигура, пройденные клетки) возвращает true, чтобы остановиться.
function rayWalk(b, r, c, dr, dc, cb) {
    let rr = r + dr, cc = c + dc, hops = 0;
    const path = [];
    while (inb(rr, cc)) {
        const t = b[rr][cc];
        if (cb(rr, cc, t, path)) return;
        path.push([rr, cc]);
        if (vineAt(rr, cc)) return;                     // лоза блокирует путь дальше себя
        if (!t && hops < 4) {
            const ex = portalExit(rr, cc);
            if (ex) {                                   // пустой портал: луч выходит из парного
                hops++;
                const te = b[ex[0]][ex[1]];
                if (cb(ex[0], ex[1], te, path)) return;
                path.push([ex[0], ex[1]]);
                rr = ex[0] + dr; cc = ex[1] + dc;
                continue;
            }
        }
        rr += dr; cc += dc;
    }
}

// Клетки, до которых «достаёт» фигура типа tp (конь или слайдер).
// Луч идёт до первой настоящей фигуры включительно; иллюзии прозрачны; порталы переносят луч.
function lineSquares(b, r, c, tp) {
    const out = [];
    if (tp === 'n') {
        KN.forEach(([dr, dc]) => { if (inb(r + dr, c + dc)) out.push([r + dr, c + dc]); });
        return out;
    }
    const dirs = tp === 'b' ? DIAG : tp === 'r' ? ORTH : [...DIAG, ...ORTH];
    const ac = b[r][c].c;
    dirs.forEach(([dr, dc]) => rayWalk(b, r, c, dr, dc, (rr, cc, t) => {
        out.push([rr, cc]);
        return !!(t && !t.ghost && !passThru(t, ac, rr, cc) && !supOpen(b, t));
    }));
    return out;
}

// Клетки, которые бьёт фигура (с учётом пришитых способов ходить)
function attackSquares(b, r, c) {
    const p = b[r][c], out = [];
    if (p.scared) {                               // напуганная фигура бьёт только на 1 клетку по своим направлениям
        if (p.t === 'p') return out;
        moveTypes(p).forEach(tp => scaredDirs(tp).forEach(([dr, dc]) => { if (inb(r + dr, c + dc)) out.push([r + dr, c + dc]); }));
        return out;
    }
    moveTypes(p).forEach(tp => {
        if (tp === 'p') {
            const d = p.c === 'w' ? -1 : 1;
            [-1, 1].forEach(dc => { if (inb(r + d, c + dc)) out.push([r + d, c + dc]); });
        } else if (tp === 'k') {
            KG.forEach(([dr, dc]) => { if (inb(r + dr, c + dc)) out.push([r + dr, c + dc]); });
        } else if (tp === 'j') {
            ORTH.forEach(([dr, dc]) => { if (inb(r + dr, c + dc)) out.push([r + dr, c + dc]); });
        } else {
            out.push(...lineSquares(b, r, c, tp));
        }
    });
    return out;
}

// Замороженные, пойманные капканом фигуры и иллюзии никого не атакуют
function isAttacked(b, r, c, by, noKing) {
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const p = b[i][j];
            if (!p || p.c !== by || p.frozen > 0 || p.snared > 0 || p.ghost || p.cap > 0 || (noKing && p.t === 'k')) continue;      // фигура в шутовском колпаке шахов не создаёт
            if (attackSquares(b, i, j).some(([x, y]) => x === r && y === c)) return true;
        }
    }
    return false;
}

function findKing(b, col) {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (p && p.t === 'k' && p.c === col && !p.ghost) return [r, c];
    }
    return null;
}

function kingAttacked(b, col) {
    const k = findKing(b, col);
    return !k || isAttacked(b, k[0], k[1], other(col));
}

/* ---------- Пассивки: Братство Паладина и барьер Мага ---------- */

// Пара пешек Паладина (ровно две подряд на одной горизонтали) не рубится
function brotherImmune(b, r, c) {
    const p = b[r][c];
    if (!p || p.t !== 'p' || p.ghost || p.orig || G.hero[p.c] !== 'paladin') return false;
    const own = x => { const q = b[r][x]; return !!q && q.t === 'p' && q.c === p.c && !q.ghost && !q.orig; };
    let lo = c, hi = c;
    while (lo > 0 && own(lo - 1)) lo--;
    while (hi < 7 && own(hi + 1)) hi++;
    return hi - lo + 1 === 2;
}

// Фигура Мага в радиусе 3×3 от его короля
function auraProtected(b, r, c) {
    const p = b[r][c];
    if (p && p.t !== 'k' && p.warded > 0) return true;                     // Очищение: такая же защита, как у барьера
    if (!p || p.t === 'k' || p.orig || G.hero[p.c] !== 'mage') return false;
    const k = findKing(b, p.c);
    return !!k && Math.abs(k[0] - r) <= 1 && Math.abs(k[1] - c) <= 1;
}

// Неуязвима ли фигура на клетке к любым способностям и ловушкам: короли всегда, фигуры у короля Мага.
// Их можно убить только срубив другой фигурой.
function magicProof(b, r, c, owner, ignoreFrozen) {
    const p = b[r][c];
    if (!p) return false;
    if (p.t === 'k') return true;
    if (!ignoreFrozen && p.frozen > 0) return true;   // заморозка защищает от магии (кроме огненного шара)
    return auraProtected(b, r, c);
}

/* ---------- Горящие клетки ---------- */
const burnAt = (r, c) => G.burn.find(t => t.r === r && t.c === c);

function burnTile(r, c, owner) {
    G.burn = G.burn.filter(t => !(t.r === r && t.c === c));
    G.burn.push({ r, c, owner, life: CONFIG.burnTurns });
}

// Король в безопасности сейчас, после взрыва вражеских шаров/стрел
// и (если settle) после того, как у игрока закончится гипноз над фигурами
function kingSafe(b, col, fires, settle) {
    let bb = b;
    if (settle && b.some(row => row.some(p => p && p.hypno === 1 && p.c === col))) {
        bb = cloneBoard(b);
        bb.forEach(row => row.forEach(p => { if (p && p.hypno === 1 && p.c === col) p.c = p.orig; }));
    }
    if (kingAttacked(bb, col)) return false;
    const enemyFires = fires.filter(f => f.owner !== col);
    if (enemyFires.length) {
        const b2 = cloneBoard(bb);
        let changed = false;
        enemyFires.forEach(f => {
            if (f.kind === 'shomen') {
                for (let r = 0; r < 8; r++) if (b2[r][f.c] && !magicProof(b2, r, f.c)) { b2[r][f.c] = null; changed = true; }
                return;
            }
            const p = b2[f.r][f.c];
            if (p && !magicProof(b2, f.r, f.c, f.owner, f.kind === 'fire')) { b2[f.r][f.c] = null; changed = true; }
        });
        if (changed && kingAttacked(b2, col)) return false;
    }
    // бомбы Самурая врага, которые взорвутся в начале его следующего хода
    const bombs = [];
    bb.forEach((row, r) => row.forEach((p, c) => { if (p && p.bomb === 1 && p.bombBy !== col) bombs.push([r, c]); }));
    if (bombs.length) {
        const b3 = cloneBoard(bb);
        let changed = false;
        bombs.forEach(([r, c]) => {
            for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
                const rr = r + dr, cc = c + dc;
                if (inb(rr, cc) && b3[rr][cc] && !magicProof(b3, rr, cc)) { b3[rr][cc] = null; changed = true; }
            }
        });
        if (changed && kingAttacked(b3, col)) return false;
    }
    return true;
}

function pseudoMoves(b, r, c) {
    const p = b[r][c], mv = [], seen = new Set();
    if (!p || p.frozen > 0 || p.snared > 0) return mv;
    const ghost = !!p.ghost;                                   // иллюзия ходит, но никого не рубит
    const harvest = !ghost && !p.orig && G.hero[p.c] === 'necromancer';   // Жатва: рубит свои пешки
    const add = (tr, tc, extra = {}) => {
        const k = tr + ',' + tc + (extra.castle ? 'c' : '') + (extra.ep ? 'e' : '') + (extra.double ? 'd' : '');
        if (seen.has(k)) return;
        seen.add(k);
        mv.push({ fr: r, fc: c, tr, tc, ...extra });
    };
    // Рубить можно врага, но не короля, не иллюзию, не замороженного, не пару пешек Паладина;
    // король не рубит фигуру под щитом; Некромант рубит свои пешки
    const passable = t => !t || (t.ghost && t.c === p.c) || (!ghost && supOpen(b, t));   // своя иллюзия и фигура в суперпозиции не мешают
    const canTake = (t, tr, tc) => {
        if (ghost || !t || t.ghost || t.t === 'k' || t.frozen) return false;
        if (p.t === 'k' && t.shield) return false;
        if (t.c === p.c) return harvest && t.t === 'p' && !t.orig;
        return !brotherImmune(b, tr, tc);
    };

    if (p.scared) {                               // испуг: дальность хода 1 клетка
        if (p.t === 'p') {                        // пешка: только на 1 вперёд, без рубки, двойного хода и взятия на проходе
            const f = p.c === 'w' ? -1 : 1, lastRank = p.c === 'w' ? 0 : 7, tr = r + f;
            if (inb(tr, c) && passable(b[tr][c]) && !(ghost && tr === lastRank)) add(tr, c, { promo: tr === lastRank });
            return mv;
        }
        moveTypes(p).forEach(tp => scaredDirs(tp).forEach(([dr, dc]) => {
            const tr = r + dr, tc = c + dc;
            if (!inb(tr, tc)) return;
            const t = b[tr][tc];
            if (passable(t) || canTake(t, tr, tc)) add(tr, tc);
        }));
        return mv;
    }

    if (p.t === 'p') {
        const d = p.c === 'w' ? -1 : 1, start = p.c === 'w' ? 6 : 1, last = p.c === 'w' ? 0 : 7;
        const f1 = inb(r + d, c) ? b[r + d][c] : null;
        const open1 = inb(r + d, c) && passable(f1);
        if (open1 && !(ghost && r + d === last)) add(r + d, c, { promo: r + d === last });
        // двойной ход: первая клетка свободна ИЛИ на ней прозрачная для нас фигура (призрачная, на Ритуале)
        if ((open1 || (f1 && passThru(f1, p.c, r + d, c))) && r === start && inb(r + 2 * d, c) && passable(b[r + 2 * d][c]) && !vineAt(r + d, c)) add(r + 2 * d, c, { double: true });
        [-1, 1].forEach(dc => {
            const tr = r + d, tc = c + dc;
            if (!inb(tr, tc)) return;
            const t = b[tr][tc];
            if (t && supOpen(b, t)) return;      // фигуру в суперпозиции пешка рубить не может
            if (canTake(t, tr, tc)) add(tr, tc, { promo: tr === last });
            else if (!t && !ghost && G.ep && G.ep.r === tr && G.ep.c === tc) {
                const v = b[G.ep.pr][G.ep.pc];
                if (v && v.t === 'p' && v.c !== p.c && !v.frozen && !v.ghost && !brotherImmune(b, G.ep.pr, G.ep.pc)) {
                    add(tr, tc, { ep: true, pr: G.ep.pr, pc: G.ep.pc });
                }
            }
        });
        return mv;
    }

    moveTypes(p).forEach(tp => {
        if (tp === 'n') {
            KN.forEach(([dr, dc]) => {
                const tr = r + dr, tc = c + dc;
                if (!inb(tr, tc)) return;
                const t = b[tr][tc];
                if (passable(t) || canTake(t, tr, tc)) add(tr, tc);
            });
        } else if (tp === 'j') {                       // заводные челюсти: на 1 клетку по вертикали и горизонтали, ходят и рубят
            ORTH.forEach(([dr, dc]) => {
                const tr = r + dr, tc = c + dc;
                if (!inb(tr, tc)) return;
                const t = b[tr][tc];
                if (passable(t) || canTake(t, tr, tc)) add(tr, tc);
            });
        } else if (tp === 'k') {
            KG.forEach(([dr, dc]) => {
                const tr = r + dr, tc = c + dc;
                if (!inb(tr, tc)) return;
                const t = b[tr][tc];
                if (passable(t) || canTake(t, tr, tc)) add(tr, tc);
            });
            // Паранормальщина Призрака: король вселяется в цепочку своих фигур
            if (p.t === 'k' && !ghost && G.hero[p.c] === 'phantom') {
                possessCells(b, r, c).forEach(([tr, tc]) => add(tr, tc, { path: [], possess: true }));
            }
            // Рокировка
            if (!p.moved && !ghost && !isAttacked(b, r, c, other(p.c))) {
                [
                    { rc: 7, between: [5, 6], path: [5, 6], kt: 6, rt: 5, dest: [5, 6] },
                    { rc: 0, between: [1, 2, 3], path: [3, 2], kt: 2, rt: 3, dest: [2, 3] }
                ].forEach(o => {
                    const rk = b[r][o.rc];
                    if (rk && rk.t === 'r' && rk.c === p.c && !rk.moved && !rk.frozen && !rk.snared && !rk.ghost &&
                        o.between.every(x => (!b[r][x] || (!o.dest.includes(x) && b[r][x].c === p.c && isPhase(b[r][x]))) && !burnAt(r, x) && !vineAt(r, x)) &&
                        o.path.every(x => !isAttacked(b, r, x, other(p.c)))) {
                        add(r, o.kt, { castle: true, rc: o.rc, rt: o.rt });
                    }
                });
            }
        } else {
            const dirs = tp === 'b' ? DIAG : tp === 'r' ? ORTH : [...DIAG, ...ORTH];
            dirs.forEach(([dr, dc]) => rayWalk(b, r, c, dr, dc, (tr, tc, t, path) => {
                if (!t) { add(tr, tc, { path: path.slice() }); return false; }
                if (t.ghost) {
                    if (t.c === p.c) add(tr, tc, { path: path.slice() });   // своя иллюзия: можно встать, она рассеется
                    return false;                                            // чужая иллюзия прозрачна
                }
                if (passThru(t, p.c, tr, tc)) {                           // сквозь прозрачную фигуру можно пройти
                    if (t.c !== p.c && canTake(t, tr, tc)) add(tr, tc, { path: path.slice() });   // вражескую фигуру на своём Ритуале можно ещё и срубить
                    return false;
                }
                if (!ghost && supOpen(b, t)) { add(tr, tc, { path: path.slice() }); return false; }   // суперпозиция: не мешает, можно встать
                if (canTake(t, tr, tc)) add(tr, tc, { path: path.slice() });
                return true;
            }));
        }
    });
    return mv;
}

// Клетки, куда король Призрака может «вселиться»: свободные клетки 3×3 вокруг любой фигуры цепочки,
// где каждая фигура стоит в 3×3 от предыдущей (цепочка начинается рядом с королём)
function possessCells(b, r, c) {
    const col = b[r][c].c, seen = new Set(), queue = [[r, c]], chain = [];
    while (queue.length) {
        const [cr, cc] = queue.shift();
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            const nr = cr + dr, nc = cc + dc;
            if ((!dr && !dc) || !inb(nr, nc) || seen.has(nr * 8 + nc)) continue;
            const t = b[nr][nc];
            if (!t || t.c !== col || t.ghost || t.t === 'k') continue;
            seen.add(nr * 8 + nc);
            chain.push([nr, nc]);
            queue.push([nr, nc]);
        }
    }
    const out = new Map();
    chain.forEach(([pr, pc]) => {
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            const nr = pr + dr, nc = pc + dc;
            if (inb(nr, nc) && !b[nr][nc]) out.set(nr * 8 + nc, [nr, nc]);
        }
    });
    return [...out.values()];
}

// Клетки, которые фигура пересекает при ходе (конь прыгает, конечная клетка считается всегда)
function pathCells(mv) {
    const dr = mv.tr - mv.fr, dc = mv.tc - mv.fc, cells = [];
    const knight = (Math.abs(dr) === 1 && Math.abs(dc) === 2) || (Math.abs(dr) === 2 && Math.abs(dc) === 1);
    if (!knight) {
        const n = Math.max(Math.abs(dr), Math.abs(dc)), sr = Math.sign(dr), sc = Math.sign(dc);
        for (let i = 1; i < n; i++) cells.push([mv.fr + sr * i, mv.fc + sc * i]);
    }
    cells.push([mv.tr, mv.tc]);
    return cells;
}

// Все клетки хода: пройденные и конечная (учитывает порталы)
const moveCells = mv => (mv.path ? [...mv.path, [mv.tr, mv.tc]] : pathCells(mv));

// Применяет ход к доске (меняет её). Возвращает список погибших фигур.
// Ценность фигур для выбора ангела-хранителя (у Франкенштейна считается исходная фигура, пришитые ходы не в счёт)
const PIECE_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, j: 1 };

// Ангел-хранитель: если рядом с жертвой несколько ангелов, собой жертвует наименее ценный (при равенстве «случайный», одинаковый у обоих игроков онлайн).
// Какую из погибающих фигур спасать, решает orderVictims: самую ценную (при равенстве слон раньше коня).
function pickGuardian(board, vr, vc, victim, exclude, unsafe) {
    let cands = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const ar = vr + dr, ac = vc + dc;
        if (!inb(ar, ac)) continue;
        const a = board[ar][ac];
        if (!a || a === exclude || a === victim || !(a.altruist > 0) || a.c !== victim.c || a.t === 'k' || a.ghost || a.frozen > 0) continue;
        if (unsafe && unsafe(ar, ac)) continue;
        cands.push({ a, v: victim, from: [ar, ac], to: [vr, vc] });
    }
    if (!cands.length) return null;
    const low = Math.min(...cands.map(x => PIECE_VAL[x.a.t] || 0));
    cands = cands.filter(x => (PIECE_VAL[x.a.t] || 0) === low);
    if (cands.length === 1) return cands[0];
    const h = ((G && G.log ? G.log.length : 0) * 31 + ((G && G.deaths) || 0) * 17 + vr * 8 + vc) >>> 0;
    return cands[h % cands.length];
}

function applyMove(board, mv, promo) {
    const p = board[mv.fr][mv.fc];
    const res = { dead: [], thorn: false, burned: false, vanished: [], supBack: [] };
    // своя иллюзия на пути или на конечной клетке рассеивается
    moveCells(mv).forEach(([r, c]) => {
        const g = board[r][c];
        if (g && g.ghost && g !== p && g.c === p.c) { res.vanished.push({ r, c, g }); board[r][c] = null; }
    });
    // фигуры в суперпозиции на пути или на конечной клетке: не мешают и не гибнут, возвращаются назад
    const supHits = [];
    if (!p.ghost) moveCells(mv).forEach(([r, c]) => {
        const q = board[r][c];
        if (q && q !== p && supOpen(board, q) && !supHits.some(h => h.q === q)) supHits.push({ q, r, c });
    });
    let victim = null;
    if (mv.ep) { victim = board[mv.pr][mv.pc]; board[mv.pr][mv.pc] = null; }
    else if (board[mv.tr][mv.tc] && !supHits.some(h => h.r === mv.tr && h.c === mv.tc)) victim = board[mv.tr][mv.tc];
    // Колпак Шута: срубивший носителя колпака погибает вместо него (король неуязвим для магии), колпак слетает.
    // Если из-за гибели срубившего его собственному королю откроется шах, он остаётся жив, колпак всё равно слетает, ход потрачен
    // Фигура под Очищением или в ауре Мага (на клетке, куда она рубит) игнорирует колпак и просто рубит
    const capImmune = !!(victim && victim.cap > 0 && (p.warded > 0 || (!p.orig && G.hero[p.c] === 'mage' && (() => { const k = findKing(board, p.c); return !!k && Math.abs(k[0] - mv.tr) <= 1 && Math.abs(k[1] - mv.tc) <= 1; })())));
    if (victim && victim.cap > 0 && victim.c !== p.c && p.t !== 'k' && !p.ghost && !victim.ghost && !capImmune) {
        if (mv.ep) board[mv.pr][mv.pc] = victim;
        delete victim.cap; delete victim.capBy;
        res.capBack = victim;
        board[mv.fr][mv.fc] = null;
        if (kingAttacked(board, p.c)) { board[mv.fr][mv.fc] = p; res.capSaved = true; }
        else {
            // Ангел-хранитель рядом со срубившим: меняется с ним местами и гибнет вместо него
            const gd = pickGuardian(board, mv.fr, mv.fc, p, p);
            if (gd) {
                board[gd.from[0]][gd.from[1]] = p;
                if (kingAttacked(board, p.c)) { board[gd.from[0]][gd.from[1]] = gd.a; board[mv.fr][mv.fc] = p; res.capSaved = true; }
                else { res.dead.push(gd.a); res.guard = gd; }
            } else res.dead.push(p);
        }
        return res;
    }
    // Ангел-хранитель: самоотверженная фигура рядом меняется с жертвой местами и гибнет вместо неё
    if (victim && victim.t !== 'k' && !victim.ghost) {
        const vr = mv.ep ? mv.pr : mv.tr, vc = mv.ep ? mv.pc : mv.tc;
        const guard = pickGuardian(board, vr, vc, victim, p);
        if (guard) {
            board[guard.from[0]][guard.from[1]] = victim;
            victim = guard.a;
            res.guard = guard;
        }
    }
    board[mv.fr][mv.fc] = null;
    board[mv.tr][mv.tc] = p;
    p.moved = true;
    delete p.scared; delete p.scaredT;    // страх спадает после хода
    if (p.sup) delete p.sup;              // суперпозиция спадает после хода самой фигуры
    p.prev = [mv.fr, mv.fc];
    if (victim) res.dead.push(victim);
    if (mv.castle) {
        const rk = board[mv.fr][mv.rc];
        board[mv.fr][mv.rc] = null;
        board[mv.fr][mv.rt] = rk;
        rk.moved = true;
        rk.prev = [mv.fr, mv.rc];
    }
    // Гибель на горящей или острой клетке: рядом самоотверженный ангел-хранитель меняется с ней местами и гибнет вместо неё
    const tileDeath = isSharp => {
        const gd = pickGuardian(board, mv.tr, mv.tc, p, p,
            (ar, ac) => G.burn.some(x => x.r === ar && x.c === ac) || !!sharpAt(ar, ac));
        res.burned = true;
        if (isSharp) res.sharp = true;
        if (gd) {
            board[gd.from[0]][gd.from[1]] = p;
            board[mv.tr][mv.tc] = null;
            res.dead.push(gd.a);
            res.guard = gd;
            res.saved = true;
        } else {
            board[mv.tr][mv.tc] = null;
            res.dead.push(p);
        }
    };
    if (victim && victim.shield && !auraProtected(board, mv.tr, mv.tc)) {   // шипы убивают того, кто срубил (кроме фигур под барьером Мага)
        board[mv.tr][mv.tc] = null;
        res.dead.push(p);
        res.thorn = true;
    } else {
        if (mv.promo) p.t = promo || 'q';
        // горящая клетка на пути или в конце хода: фигура сгорает (король неуязвим, конь перепрыгивает)
        if (p.t !== 'k' && G.burn.length) {
            const hit = moveCells(mv).map(([r, c]) => burnAt(r, c)).find(Boolean);
            if (hit && !magicProof(board, mv.tr, mv.tc, hit.owner, true)) tileDeath(false);
        }
        // острая клетка Самурая: вставшая на неё фигура погибает (пройти сквозь можно)
        if (!res.burned && p.t !== 'k' && G.sharp.length) {
            const z = sharpAt(mv.tr, mv.tc);
            if (z && !magicProof(board, mv.tr, mv.tc)) tileDeath(true);
        }
        // Гипноз спадает, если загипнотизированная фигура срубила фигуру
        if (p.hypno && victim && board[mv.tr][mv.tc] === p) {
            p.c = p.orig;
            delete p.orig; delete p.hypno; delete p.fresh;
            res.released = true;
        }
    }
    // Суперпозиция: фигуры возвращаются на прежнее место. Если туда встала ходившая фигура, её рубят
    supHits.forEach(({ q, r, c }) => {
        const [pr, pc] = q.prev;
        const occ = board[pr][pc];
        if (occ && occ !== p) return;                        // место занято: суперпозиция ничего не делает
        if (board[r][c] === q) board[r][c] = null;
        board[pr][pc] = q;
        delete q.sup;
        if (occ === p) { res.dead.push(p); res.supKill = true; res.burned = true; }
        res.supBack.push({ q, from: [r, c], to: [pr, pc] });
    });
    return res;
}

/* ---------- Конвейеры и порталы Архитектора: срабатывают в конце каждого хода ---------- */
function applyEffects(b, log) {
    if (!G.conv.length && !G.portals.length && !G.hogs.length) return;
    const touched = new Set();
    // 1. Конвейеры толкают фигуру на себе (и всю колонну перед ней)
    G.conv.map(cv => ({ cv, p: b[cv.r][cv.c] })).filter(x => x.p).forEach(({ cv, p }) => {
        if (b[cv.r][cv.c] !== p || touched.has(p)) return;
        const [dr, dc] = cv.dir;
        const chain = [];
        let r = cv.r, c = cv.c;
        while (inb(r, c) && b[r][c]) { chain.push([r, c]); r += dr; c += dc; }
        if (!inb(r, c)) return;                     // некуда толкать: остаются на месте
        if (chain.some(([cr, cc]) => auraProtected(b, cr, cc))) return;   // магический барьер Мага: конвейер не двигает
        for (let i = chain.length - 1; i >= 0; i--) {
            const [cr, cc] = chain[i], q = b[cr][cc];
            b[cr + dr][cc + dc] = q;
            b[cr][cc] = null;
            q.moved = true;
            touched.add(q);
        }
        if (log) G.fx.push({ r: cv.r + dr, c: cv.c + dc, type: 'land' });
    });
    // 2. Порталы: фигуры на концах пары перемещаются на противоположный конец
    const done = new Set();
    G.portals.forEach(pt => {
        if (done.has(pt.id)) return;
        done.add(pt.id);
        const ends = G.portals.filter(x => x.id === pt.id);
        if (ends.length < 2) return;
        const [a, c2] = ends, pa = b[a.r][a.c], pb = b[c2.r][c2.c];
        if (!pa && !pb) return;
        if ((pa && touched.has(pa)) || (pb && touched.has(pb))) return;
        b[a.r][a.c] = pb;
        b[c2.r][c2.c] = pa;
        [pa, pb].forEach(q => { if (q) { q.moved = true; touched.add(q); } });
        if (log) G.fx.push({ r: a.r, c: a.c, type: 'ghost' }, { r: c2.r, c: c2.c, type: 'ghost' });
    });
    // 3. Ход сурка: фигура на временной ловушке возвращается туда, откуда пришла (король не страдает)
    G.hogs.slice().forEach(h => {
        const q = b[h.r][h.c];
        if (!q) { if (log) h.exempt = null; return; }
        if (q.ghost || q.t === 'k' || (h.exempt && q.uid === h.exempt)) return;
        const pv = q.prev;
        if (!pv || b[pv[0]][pv[1]]) return;
        b[pv[0]][pv[1]] = q;
        b[h.r][h.c] = null;
        if (log) {
            if (CONFIG.hogOnce) G.hogs = G.hogs.filter(x => x !== h);
            G.fx.push({ r: h.r, c: h.c, type: 'poof' }, { r: pv[0], c: pv[1], type: 'ghost' });
            addLog('n', q.invis ? '⏳ Ход сурка: невидимая фигура вернулась назад' : `⏳ Ход сурка: ${pieceSym(q)} возвращается с ${sqName(h.r, h.c)} на ${sqName(pv[0], pv[1])}`);
        }
    });
}

// Король в безопасности после хода/способности, с учётом срабатывания конвейеров и порталов (nb: копия доски)
function safeAfter(nb, col) {
    applyEffects(nb, false);
    return kingSafe(nb, col, G.fire, true);
}

// Шут знает свои банановые кожуры: фигура, вставшая на неё, съедет на соседнюю клетку (для проверки шаха)
function bananaSlideOnBoard(nb, r, c, col) {
    if (typeof G === 'undefined' || !G || !G.bananas || !G.bananas.length) return;
    const bn = G.bananas.find(x => x.r === r && x.c === c && x.owner === col);
    const q = nb[r][c];
    if (!bn || !q || q.c !== col || q.t === 'k' || q.ghost || q.warded > 0) return;
    const tr = r + bn.dir[0], tc = c + bn.dir[1];
    if (inb(tr, tc) && !nb[tr][tc]) { nb[tr][tc] = q; nb[r][c] = null; }
}

function isLegalMove(b, mv) {
    const col = b[mv.fr][mv.fc].c;
    const nb = cloneBoard(b);
    const res = applyMove(nb, mv, 'q');
    if (res.dead.some(d => d.t === 'k')) return false;
    bananaSlideOnBoard(nb, mv.tr, mv.tc, col);      // если после съезжания король окажется под шахом, такой ход недоступен
    return safeAfter(nb, col);
}

const legalMovesAt = (b, r, c) => pseudoMoves(b, r, c).filter(m => isLegalMove(b, m));

// Иллюзии в счёт возможных ходов не идут: они не могут снять шах
function anyLegalMove(b, col) {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (p && p.c === col && !p.ghost && asJester(p, col, () => legalMovesAt(b, r, c)).length) return true;
    }
    return false;
}

// Ходы зомби, которые обязаны рубить
function zombieForced(col) {
    const out = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const p = G.board[r][c];
        if (!p || p.c !== col || !p.zombie || p.ghost) continue;
        legalMovesAt(G.board, r, c).forEach(m => {
            const t = G.board[m.tr][m.tc];
            if (m.ep || (t && t.c !== p.c && !t.ghost && !t.invis && !supOpen(G.board, t))) out.push(m);   // обязаны рубить только вражеские фигуры
        });
    }
    return out;
}

// Ходы, которые обязан сделать игрок из-за приманки врага (кроме королевских)
function lureForced(col) {
    const out = [];
    if (!G.lureCells.length && !G.board.some(row => row.some(p => p && p.lure))) return out;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const p = G.board[r][c];
        if (!p || p.c !== col || p.t === 'k' || p.ghost) continue;
        legalMovesAt(G.board, r, c).forEach(m => {
            const t = m.ep ? G.board[m.pr][m.pc] : G.board[m.tr][m.tc];
            const onPiece = t && t.lure && t.lure !== col;
            const onCell = G.lureCells.some(l => l.r === m.tr && l.c === m.tc && l.owner !== col);
            if (onPiece || onCell) out.push(m);
        });
    }
    return out;
}

function computeForced(col) {
    const z = G.noZForce ? [] : zombieForced(col);
    const l = lureForced(col);
    let out;
    if (z.length && l.length) {
        const both = z.filter(m => l.some(x => sameMove(x, m)));
        out = both.length ? both : z;
    } else out = z.length ? z : l;
    G.forcedKind = z.length ? 'zombie' : l.length ? 'lure' : null;
    return out;
}

/* =====================================================================
   ИЛЛЮЗИИ
   ===================================================================== */
function findGhost(pair) {
    if (pair == null) return null;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const p = G.board[r][c];
        if (p && p.ghost && p.pair === pair) return { r, c, p };
    }
    return null;
}
function findOriginal(pair) {
    if (pair == null) return null;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const p = G.board[r][c];
        if (p && !p.ghost && p.pair === pair) return { r, c, p };
    }
    return null;
}

// Вражеская пешка упирается в клетку (или может прыгнуть на неё двойным ходом)
function pawnFrontThreat(b, r, c, enemy) {
    const d = enemy === 'w' ? -1 : 1, start = enemy === 'w' ? 6 : 1;
    const p1 = inb(r - d, c) ? b[r - d][c] : null;
    if (p1 && p1.t === 'p' && p1.c === enemy && !p1.frozen && !p1.ghost) return true;
    if (inb(r - 2 * d, c)) {
        const p2 = b[r - 2 * d][c];
        if (p2 && p2.t === 'p' && p2.c === enemy && !p2.frozen && !p2.ghost && r - 2 * d === start && (!b[r - d][c] || passThru(b[r - d][c], enemy, r - d, c))) return true;
    }
    return false;
}

/* ---------- Невидимые фигуры Самурая (Фукаши) ---------- */
// Почему фигура на клетке должна стать видимой (или null)
function invisReason(b, r, c) {
    const p = b[r][c], enemy = other(p.c);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
        const q = b[i][j];
        if (q && q.c === enemy && q.t === 'p' && !q.ghost && !(q.frozen > 0) && !(q.snared > 0) &&
            attackSquares(b, i, j).some(([x, y]) => x === r && y === c)) return 'ей угрожает пешка';
    }
    const k = findKing(b, enemy);
    if (k && !(p.frozen > 0) && !(p.snared > 0) && attackSquares(b, r, c).some(([x, y]) => x === k[0] && y === k[1])) return 'шах';
    return null;
}

function revealPiece(r, c, why) {
    const p = G.board[r][c];
    if (p.lie) { revealLie(r, c); return; }
    delete p.invis;
    if (p.uid) G.log.forEach(e => { if (e.hid === p.uid) { e.text = e.real + ' 🥷'; delete e.hid; delete e.real; } });
    G.fx.push({ r, c, type: 'ghost' });
    sfx('poof');
    addLog('n', `🥷 ${pieceSym(p)} на ${sqName(r, c)} стала видимой (${why})`);
}

function checkInvis() {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const p = G.board[r][c];
        if (!p || !p.invis) continue;
        const why = invisReason(G.board, r, c);
        if (why) revealPiece(r, c, why);
    }
}

// Невидимая вражеская фигура, из-за которой ход d был бы незаконным (связка). Иначе null
function pinnerOf(p, d) {
    try {
        const nb = cloneBoard(G.board);
        applyMove(nb, d, 'q');
        const k = findKing(nb, p.c);
        if (!k) return null;
        for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
            const q = nb[i][j];
            if (q && q.c === other(p.c) && q.invis && !q.ghost && !(q.frozen > 0) && !(q.snared > 0) &&
                attackSquares(nb, i, j).some(([x, y]) => x === k[0] && y === k[1])) return [i, j];
        }
    } catch (e) { /* ход нельзя промоделировать: связки нет */ }
    return null;
}

// Игрок упёрся в невидимку (пешка идёт прямо на неё или связанная фигура пытается сойти): она раскрывается, ход не тратится
function bumpInvis(mv) {
    if (!G.sel) return;
    const sr = G.sel.r, sc = G.sel.c, p = G.board[sr][sc];
    let tgt = null, why = '';
    if (mv.pin) { tgt = mv.pin; why = p && p.t === 'k' ? 'король попытался встать под её удар' : 'фигура, которую она связывала, попыталась сойти'; }
    else if (mv.blk && p && p.t === 'p') { tgt = mv.blk; why = 'в неё упёрлась пешка'; }
    if (!tgt) return;
    const q = G.board[tgt[0]][tgt[1]];
    if (!q || !q.invis || q.c === p.c) return;
    revealPiece(tgt[0], tgt[1], why);
    G.sel = { r: sr, c: sc };
    G.moves = selectableMoves(sr, sc);
    render();
}

// Вид ходов для игрока: невидимые фигуры «прозрачны». Ходы сквозь них показываются,
// но по факту ведут в рубку невидимой фигуры (врагом) или не работают (своей фигурой)
function applyInvisView(p, r, c, mv) {
    if (!G.board.some(row => row.some(q => q && q.invis))) return mv;
    const ab = G.board.map(row => row.map(q => (q && !(q.invis && q !== p) ? { ...q } : null)));
    const disp = legalMovesAt(ab, r, c);
    const shown = new Set(), out = [];
    disp.forEach(d => {
        const real = mv.find(m => m.tr === d.tr && m.tc === d.tc);
        if (real) { shown.add(real); return; }
        const blk = moveCells(d).find(([rr, cc]) => { const q = G.board[rr][cc]; return q && q.invis && q !== p; });
        if (!blk) {
            const pin = pinnerOf(p, d);      // фигуру связывает невидимка, а королю она грозит клетке (король её не «видит» и пытается туда встать)
            if (pin) out.push({ ...d, decoy: true, redirect: null, pin });
            return;
        }
        const red = mv.find(m => m.tr === blk[0] && m.tc === blk[1]) || null;
        out.push({ ...d, decoy: true, redirect: red, blk });
    });
    mv.forEach(m => { if (!shown.has(m)) m.hidden = true; });
    return mv.concat(out);
}

// Король врага может безопасно срубить фигуру на клетке (её не прикрывают)
function kingThreat(b, r, c, col) {
    const enemy = other(col), k = findKing(b, enemy);
    if (!k || Math.abs(k[0] - r) > 1 || Math.abs(k[1] - c) > 1) return false;
    const kp = b[k[0]][k[1]];
    if (kp.frozen > 0 || kp.snared > 0) return false;
    const t = b[r][c];
    if (t && t.shield) return false;
    return !isAttacked(b, r, c, col);
}

// Иллюзия «грозит» королю (шах или клетки рядом) только внешне: реальные фигуры эти клетки не прикрывают
function ghostExposed(b, gr, gc, col) {
    const enemy = other(col), k = findKing(b, enemy);
    if (!k || !b[gr][gc]) return false;
    const vis = attackSquares(b, gr, gc);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const sr = k[0] + dr, sc = k[1] + dc;
        if (!inb(sr, sc) || !vis.some(([x, y]) => x === sr && y === sc)) continue;
        const t = b[sr][sc];
        if ((dr || dc) && t && t.c === enemy) continue;       // там стоит фигура самого короля
        if (!isAttacked(b, sr, sc, col)) return true;
    }
    return false;
}

// Любая настоящая угроза двойнику или оригиналу рассеивает иллюзию
function ghostThreatened(b, gr, gc, or, oc, col) {
    const enemy = other(col);
    return isAttacked(b, gr, gc, enemy, true) || isAttacked(b, or, oc, enemy, true) ||
        pawnFrontThreat(b, gr, gc, enemy) ||
        kingThreat(b, gr, gc, col) || kingThreat(b, or, oc, col) ||
        ghostExposed(b, gr, gc, col);
}

// Можно ли поставить иллюзию фигуры p на клетку (br, bc), если оригинал стоит на (or, oc)
function ghostViable(b, br, bc, p, or, oc) {
    if (b[br][bc] || burnAt(br, bc)) return false;
    const tmp = cloneBoard(b);
    tmp[br][bc] = { ...p, ghost: true, pair: -1, moved: true };
    return !ghostThreatened(tmp, br, bc, or, oc, p.c);
}

function vanishGhost(r, c, reason, silent) {
    const g = G.board[r][c];
    if (!g || !g.ghost) return;
    const o = findOriginal(g.pair);
    if (o) delete o.p.pair;
    G.board[r][c] = null;
    G.fx.push({ r, c, type: 'poof' });
    sfx('poof');
    if (!silent) addLog('n', `🎭 Иллюзия на ${sqName(r, c)} рассеялась (${reason})`);
}

// Любая угроза двойнику или оригиналу (или потеря оригинала) — двойник исчезает
function checkIllusions() {
    // две иллюзии разных цветов: если одна угрожает другой, рассеиваются обе
    const gs = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const g = G.board[r][c];
        if (g && g.ghost && !g.fake) gs.push({ r, c, g });
    }
    const clash = new Set();
    gs.forEach(a => {
        const hit = attackSquares(G.board, a.r, a.c);
        gs.forEach(b2 => {
            if (b2.g.c !== a.g.c && hit.some(([x, y]) => x === b2.r && y === b2.c)) { clash.add(a.r + ',' + a.c); clash.add(b2.r + ',' + b2.c); }
        });
    });
    clash.forEach(k => { const [r, c] = k.split(',').map(Number); vanishGhost(r, c, 'две иллюзии столкнулись'); });
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const g = G.board[r][c];
        if (!g || !g.ghost || g.fake) continue;
        const o = findOriginal(g.pair);
        if (!o || o.p.c !== g.c) vanishGhost(r, c, 'оригинал исчез');
        else if (ghostThreatened(G.board, r, c, o.r, o.c, g.c)) vanishGhost(r, c, 'ей что-то угрожало');
    }
}

// Варианты для способности «Иллюзия»: куда пойдёт оригинал (A) и куда встанет двойник (B).
// Без дополнительных запретов: если двойник встанет под угрозу, он просто рассеется (это риск игрока).
function illusionOptions(r, c, first) {
    const b = G.board, p = b[r][c], res = [];
    if (!p || p.ghost || p.pair || p.frozen || p.snared || p.t === 'k' || p.orig || p.invis) return res;
    const touchesGhost = m => moveCells(m).some(([rr, cc]) => b[rr][cc] && b[rr][cc].ghost);
    const plain = m => !m.promo && !m.ep && !m.castle && !touchesGhost(m);
    const empties = pseudoMoves(b, r, c).filter(m => plain(m) && !b[m.tr][m.tc]);
    const moves = legalMovesAt(b, r, c).filter(plain);
    for (const A of moves) {
        const Bs = empties.filter(B => !(B.tr === A.tr && B.tc === A.tc));
        if (Bs.length) {
            res.push({ A, Bs });
            if (first) return res;
        }
    }
    return res;
}

// ZA WARUDO: это рубка? (невидимую фигуру и свою иллюзию не считаем, чтобы не выдавать их)
function zwCapture(b, m) {
    if (m.ep) return true;
    const t = b[m.tr][m.tc], p = b[m.fr][m.fc];
    return !!(t && !t.invis && !(t.ghost && p && t.c === p.c));
}

// Даёт ли ход шах (в том числе вскрытый) вражескому королю
function givesCheck(b, mv) {
    const p = b[mv.fr][mv.fc], nb = cloneBoard(b);
    applyMove(nb, mv, 'q');
    return kingAttacked(nb, other(p.c));
}

// Ходы выбранной фигуры в обычном ходе (иллюзии не должны ходить под удар)
function selectableMoves(r, c) {
    const p = G.board[r][c];
    if (G.archUsed) return [];             // Архитектор после способности не ходит фигурой
    let mv = legalMovesAt(G.board, r, c);
    if (p.ghost) {
        const o = findOriginal(p.pair);
        mv = mv.filter(m => {
            if (!o) return false;
            const nb = cloneBoard(G.board);
            applyMove(nb, m, 'q');
            if (!nb[m.tr][m.tc]) return false;       // погибла бы на опасной клетке
            return !ghostThreatened(nb, m.tr, m.tc, o.r, o.c, p.c);
        });
    }
    if (G.forced.length) mv = mv.filter(m => G.forced.some(f => sameMove(f, m)));
    // ZA WARUDO: первым ходом нельзя ни шаховать, ни рубить
    if (G.bonus && G.bonus.kind === 'zw' && G.bonus.step === 1) mv = mv.filter(m => !givesCheck(G.board, m) && !zwCapture(G.board, m));
    // доп. ход от Жатвы: цепочки из жатвы нет
    if (G.bonus) mv = mv.filter(m => { const t = G.board[m.tr][m.tc]; return !(t && t.c === G.turn); });
    // ходы сквозь свою иллюзию доступны, но не подсвечиваются (чтобы иллюзию нельзя было вычислить по подсказкам)
    mv.forEach(m => {
        m.hidden = moveCells(m).some(([rr, cc]) => { const g = G.board[rr][cc]; return g && g.ghost && g.c === p.c && g !== p; });
    });
    return applyInvisView(p, r, c, mv);
}

/* =====================================================================
   ЗАМЕШАТЕЛЬСТВО (Экстрасенс)
   ===================================================================== */
// Варианты: первый ход m1 вражеской фигуры и список вторых ходов (без рубки)
function confusionOptions(r, c, first) {
    const b = G.board, p = b[r][c], res = [];
    if (!p || p.ghost || p.t === 'k' || p.frozen > 0 || p.snared > 0) return res;
    const col = other(p.c);                       // тот, кто применяет способность
    const quiet = (bd, rr, cc) => pseudoMoves(bd, rr, cc).filter(m => !m.promo && !m.castle && !m.ep && !bd[m.tr][m.tc]);
    for (const m1 of quiet(b, r, c)) {
        const nb = cloneBoard(b);
        if (applyMove(nb, m1, 'q').burned) continue;
        const seconds = quiet(nb, m1.tr, m1.tc).filter(m2 => {
            const nb2 = cloneBoard(nb);
            if (applyMove(nb2, m2, 'q').burned) return false;
            return safeAfter(nb2, col);
        });
        if (seconds.length) {
            res.push({ m1, seconds });
            if (first) return res;
        }
    }
    return res;
}

/* =====================================================================
   ФРАНКЕНШТЕЙН
   ===================================================================== */
function eatApply(board, r, c, tr, tc) {
    const a = board[r][c], v = board[tr][tc];
    const x = [...new Set([...(a.x || []), v.t, ...(v.x || [])])].filter(t => t !== a.t);
    board[r][c] = null;
    a.x = x;
    a.moved = true;
    a.shield = a.shield || v.shield;
    a.zombie = a.zombie || v.zombie;
    a.prev = [r, c];
    board[tr][tc] = a;
}

function frankTargets(r, c) {
    const b = G.board, p = b[r][c], out = [];
    if (!p || p.ghost || p.frozen || p.snared || p.t === 'k' || p.t === 'p' || p.orig) return out;
    const seen = new Set();
    moveTypes(p).forEach(tp => lineSquares(b, r, c, tp).forEach(([tr, tc]) => {
        const t = b[tr][tc], k = tr * 8 + tc;
        if (seen.has(k) || !t || t.ghost || t.c !== p.c || t.frozen || t.t === 'k' || t.t === 'p' || t.orig) return;
        seen.add(k);
        const nb = cloneBoard(b);
        eatApply(nb, r, c, tr, tc);
        if (safeAfter(nb, p.c)) out.push([tr, tc]);
    }));
    return out;
}

/* =====================================================================
   СПАСЕНИЕ (Паладин)
   ===================================================================== */
const ownHalf = col => (col === 'w' ? [4, 5, 6, 7] : [0, 1, 2, 3]);
const ownThree = col => (col === 'w' ? [5, 6, 7] : [0, 1, 2]);      // первые три линии стороны

function rescueDests(r, c) {
    const b = G.board, p = b[r][c], col = p.c, out = [], home = col === 'w' ? 7 : 0;
    (p.t === 'p' ? ownHalf(col).filter(x => x !== home) : [home]).forEach(rr => {
        for (let cc = 0; cc < 8; cc++) {
            if (b[rr][cc] && !hiddenFor(b[rr][cc], col)) continue;
            if (p.t !== 'k' && burnAt(rr, cc)) continue;
            const nb = cloneBoard(b);
            nb[rr][cc] = nb[r][c];
            nb[r][c] = null;
            if (safeAfter(nb, col)) out.push([rr, cc]);
        }
    });
    return out;
}

/* =====================================================================
   СПОСОБНОСТИ: допустимые цели
   ===================================================================== */
function nearOwn(b, r, c, col) {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = r + dr, cc = c + dc;
        if (!inb(rr, cc)) continue;
        const p = b[rr][cc];
        if (p && p.c === col && !p.ghost) return true;
    }
    return false;
}

// Клетки, куда можно навести стрелу из короля в радиусе range
function arrowCells(col, range, ignoreFrozen) {
    const b = G.board, k = findKing(b, col), cells = [];
    if (!k) return cells;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        if (Math.max(Math.abs(r - k[0]), Math.abs(c - k[1])) > range) continue;
        if (magicProof(b, r, c, col, ignoreFrozen)) continue;
        cells.push([r, c]);
    }
    return cells;
}

/* ---------- Архитектор: вспомогательные функции ---------- */
// VIEWER: чьими глазами смотрим (внутри abilityCells и onModeCell). Вражеская невидимка для него выглядит как свободная клетка
let VIEWER = null;
// Для заводных челюстей годится любая пустая клетка, в том числе с плиткой или порталом
const isEmptyCell = (r, c) => !G.board[r][c] || (VIEWER && hiddenFor(G.board[r][c], VIEWER));
const isFreeCell = (r, c) => (!G.board[r][c] || (VIEWER && hiddenFor(G.board[r][c], VIEWER))) && !burnAt(r, c) && !G.portals.some(x => x.r === r && x.c === c) && !G.conv.some(x => x.r === r && x.c === c) &&
    !G.gens.some(x => x.r === r && x.c === c) && !G.virus.some(x => x.r === r && x.c === c) && !G.vines.some(x => x.r === r && x.c === c) &&
    !G.rituals.some(x => x.r === r && x.c === c);

// Порталы: одновременно две пары, при создании третьей самая старая исчезает
function portalsWith(col, a, b2, id) {
    const ids = [...new Set(G.portals.filter(x => x.owner === col).map(x => x.id))].sort((x, y) => x - y);
    const drop = ids.length >= 2 ? ids.slice(0, ids.length - 1) : [];
    return G.portals.filter(x => !drop.includes(x.id)).concat([{ r: a[0], c: a[1], id, owner: col }, { r: b2[0], c: b2[1], id, owner: col }]);
}

// Проверка: король в безопасности после временного изменения (doFn применяет, undoFn откатывает)
function structSafe(col, doFn, undoFn) {
    doFn();
    try { return safeAfter(cloneBoard(G.board), col); } finally { undoFn(); }
}

function conveyorDirs(r, c, col) {
    return ORTH.filter(([dr, dc]) => inb(r + dr, c + dc) &&
        structSafe(col, () => G.conv.push({ r, c, dir: [dr, dc], owner: col }), () => G.conv.pop()));
}

function portalSafe(a, b2, col) {
    const old = G.portals;
    return structSafe(col,
        () => { G.portals = portalsWith(col, a, b2, -1); },
        () => { G.portals = old; });
}

function portalPartners(a, col, first) {
    const out = [];
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        if ((r === a[0] && c === a[1]) || !isFreeCell(r, c)) continue;
        if (portalSafe(a, [r, c], col)) { out.push([r, c]); if (first) return out; }
    }
    return out;
}

// Перемещать можно только плитки и порталы (ловушки, огонь и метки не двигаются). Новые плитки добавлять сюда
const TILE_KEYS = ['conv', 'gens', 'virus', 'vines', 'rituals', 'portals', 'burn'];
function cellProps(r, c) {
    return { tiles: TILE_KEYS.flatMap(k => G[k].filter(x => x.r === r && x.c === c)) };
}
const hasProps = pr => pr.tiles.length > 0;

// Переносит все особые свойства клетки на другую, возвращает функцию отката
function moveProps(from, to) {
    const pr = cellProps(from[0], from[1]);
    const items = pr.tiles;
    items.forEach(o => { o.r = to[0]; o.c = to[1]; });
    return () => items.forEach(o => { o.r = from[0]; o.c = from[1]; });
}

function relocateDests(r, c, col, first) {
    const out = [];
    for (let rr = 0; rr < 8; rr++) for (let cc = 0; cc < 8; cc++) {
        if ((rr === r && cc === c) || !isFreeCell(rr, cc) || burnAt(rr, cc) || G.fire.some(f => f.r === rr && f.c === cc) || G.lureCells.some(x => x.r === rr && x.c === cc)) continue;   // только СВОБОДНЫЕ клетки
        let undo = null;
        if (structSafe(col, () => { undo = moveProps([r, c], [rr, cc]); }, () => undo())) {
            out.push([rr, cc]);
            if (first) return out;
        }
    }
    return out;
}

// Пассивка Охотника: цель в пределах 3 шагов от короля (шаг = на клетку по вертикали или горизонтали)
function aimCells(col) {
    const b = G.board, k = findKing(b, col), cells = [];
    if (!k) return cells;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const dr = Math.abs(r - k[0]), dc = Math.abs(c - k[1]);
        if (dr + dc > 3) continue;      // 3 шага по клеткам (вперёд/назад/вбок), то есть ромб вокруг короля
        if (magicProof(b, r, c)) continue;
        cells.push([r, c]);
    }
    return cells;
}

// ===== Невидимые фигуры и способности-размещения =====
// Невидимая вражеская фигура для игрока col выглядит как пустая клетка, но мешает: попытка поставить туда фигуру её раскрывает (ход не тратится)
const hiddenFor = (p, col) => !!p && !!p.invis && p.c !== col && !p.ghost;

// Доска глазами игрока col: вражеские невидимки исчезли, вражеские иллюзии выглядят настоящими угрозами
function visionBoard(nb, col) {
    const vb = cloneBoard(nb);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const p = vb[r][c];
        if (!p || p.c === col) continue;
        if (p.invis) vb[r][c] = null;
        else if (p.ghost) vb[r][c] = { ...p, ghost: false };
    }
    return vb;
}
// real: безопасно на самом деле. vis: безопасно на вид (игрок видит только видимое и принимает иллюзии за настоящие фигуры)
const placeVerdict = (nb, col) => ({ real: safeAfter(cloneBoard(nb), col), vis: safeAfter(visionBoard(nb, col), col) });

// Вызывается перед способностью, которая ставит фигуру на (r,c). build(nb) выполняет постановку на копии доски.
// Невидимка раскрывается, если на её клетку пытаются поставить фигуру. Угроза от невидимки раскрывает её только когда ставят КОРОЛЯ (isKing, Кагэватари).
// true — действие перехвачено, ход не тратится
function guardPlacement(col, r, c, build, isKing) {
    const b = G.board, occ = b[r][c];
    if (hiddenFor(occ, col)) { revealPiece(r, c, 'на её клетку попытались встать'); return true; }
    const nb = cloneBoard(b);
    build(nb);
    if (safeAfter(cloneBoard(nb), col)) return false;
    if (!isKing) return true;          // у обычных фигур угроза ничего не раскрывает
    const k = findKing(nb, col);
    if (k) for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
        const q = nb[i][j];
        if (!hiddenFor(q, col) || q.frozen > 0 || q.snared > 0) continue;
        if (attackSquares(nb, i, j).some(([x, y]) => x === k[0] && y === k[1])) revealPiece(i, j, 'ей встали под угрозу');
    }
    return true;          // небезопасное действие не выполняем в любом случае
}
function cancelAbilityMode() { G.mode = null; G.sel = null; G.moves = []; render(); }

// t — запись из сброса {t, x} для воскрешения и зомби; first — достаточно найти одну цель
function abilityCells(key, col, t, first) {
    const b = G.board, cells = [];
    const enemy = other(col);
    const safeNow = safeAfter(cloneBoard(b), col);

    if (key === 'resurrect' || key === 'raise') {
        (t.t === 'p' ? ownHalf(col) : [col === 'w' ? 7 : 0]).forEach(r => {   // первая горизонталь (пешка: любая из первых четырёх)
            for (let c = 0; c < 8; c++) {
                if (b[r][c] && !hiddenFor(b[r][c], col)) continue;
                const nb = cloneBoard(b);
                nb[r][c] = { ...mk(t.t, col), x: [...(t.x || [])], moved: true, zombie: key === 'raise' };
                if (safeAfter(nb, col)) cells.push([r, c]);
            }
        });
    } else if (key === 'shield') {
        if (!safeNow) return [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (p && p.c === col && !p.ghost && p.t !== 'k' && !p.shield) cells.push([r, c]);
        }
    } else if (key === 'rescue') {
        const far = ownHalf(enemy);
        far.forEach(r => {
            for (let c = 0; c < 8; c++) {
                const p = b[r][c];
                if (p && p.c === col && !p.ghost && rescueDests(r, c).length) cells.push([r, c]);
            }
        });
    } else if (key === 'fireball') {
        if (!safeNow) return [];
        return arrowCells(col, CONFIG.fireRange, true);
    } else if (key === 'arrow') {
        if (!safeNow) return [];
        return arrowCells(col, CONFIG.arrowRange);
    } else if (key === 'aim') {
        return aimCells(col);
    } else if (key === 'freeze') {
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (!p || p.t === 'k' || p.frozen > 0) continue;
            const own = p.c === col;
            if (own ? p.ghost : p.invis) continue;
            if (magicProof(b, r, c, col)) continue;
            if (p.ghost) { if (safeNow) cells.push([r, c]); continue; }
            const nb = cloneBoard(b);
            nb[r][c].frozen = CONFIG.freezeTurns + (own ? 1 : 0);
            if (safeAfter(nb, col)) cells.push([r, c]);
        }
    } else if (key === 'hypnosis') {
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (!p || p.c !== enemy || p.t === 'k' || p.frozen || p.orig || p.invis) continue;
            if (magicProof(b, r, c, col)) continue;
            if (!nearOwn(b, r, c, col)) continue;
            if (p.ghost) { if (safeNow) cells.push([r, c]); continue; }
            const nb = cloneBoard(b);
            const q = nb[r][c];
            q.orig = q.c; q.c = col; q.hypno = CONFIG.hypnoTurns; q.fresh = true;
            if (safeAfter(nb, col)) cells.push([r, c]);
        }
    } else if (key === 'confusion') {
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (!p || p.c !== enemy || p.t === 'k' || p.frozen || p.invis) continue;
            if (magicProof(b, r, c, col)) continue;
            if (p.ghost) { if (safeNow) cells.push([r, c]); continue; }
            if (confusionOptions(r, c, true).length) cells.push([r, c]);
        }
    } else if (key === 'illusion') {
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (p && p.c === col && illusionOptions(r, c, true).length) {
                cells.push([r, c]);
                if (first) return cells;
            }
        }
    } else if (key === 'frankenstein') {
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (p && p.c === col && frankTargets(r, c).length) cells.push([r, c]);
        }
    } else if (key === 'apocalypse') {
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (p && p.zombie && !p.ghost && !(p.c !== col && p.invis) && zombieMoves(r, c, col).length) cells.push([r, c]);
        }
    } else if (key === 'phase') {
        if (!safeNow) return [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (p && p.c === col && p.t !== 'k' && !p.ghost && !p.phase && !p.orig) cells.push([r, c]);
        }
    } else if (key === 'soulmates') {
        if (!safeNow) return [];
        const el = [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (p && !p.ghost && p.t !== 'k' && !p.soul && !magicProof(b, r, c) && !(p.invis && p.c !== col)) el.push([r, c]);
        }
        if (el.length >= 2) return el;
    } else if (key === 'scream') {
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (!p || p.c !== enemy || p.t === 'k' || p.scared || p.invis || magicProof(b, r, c)) continue;
            if (p.ghost) { if (safeNow) cells.push([r, c]); continue; }
            const nb = cloneBoard(b);
            nb[r][c].scared = true;
            if (safeAfter(nb, col)) cells.push([r, c]);
        }
    } else if (key === 'shomen') {
        if (!safeNow || !G.deaths) return [];          // недоступен до первой смерти
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) cells.push([r, c]);
    } else if (key === 'fukashi') {
        if (!safeNow) return [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (p && p.c === col && p.t !== 'k' && !p.ghost && !p.invis && !p.pair && !p.orig && !invisReason(b, r, c)) cells.push([r, c]);
        }
    } else if (key === 'fenyan') {
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) cells.push([r, c]);
    } else if (key === 'teleport') {
        const k = findKing(b, col);
        if (!k) return [];
        const show = [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            if (b[r][c] && !hiddenFor(b[r][c], col)) continue;
            const nb = cloneBoard(b);
            nb[r][c] = nb[k[0]][k[1]];
            nb[k[0]][k[1]] = null;
            const v = placeVerdict(nb, col);
            if (v.vis || v.real) { cells.push([r, c]); if (v.vis) show.push([r, c]); }
        }
        cells.show = show;
    } else if (key === 'conveyor') {
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            if (isFreeCell(r, c) && conveyorDirs(r, c, col).length) cells.push([r, c]);
        }
    } else if (key === 'portals') {
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            if (isFreeCell(r, c) && portalPartners([r, c], col, true).length) cells.push([r, c]);
        }
    } else if (key === 'relocate') {
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            if (hasProps(cellProps(r, c)) && relocateDests(r, c, col, true).length) cells.push([r, c]);
        }
    } else if (key === 'guardian' || key === 'purify' || key === 'bumpuku') {
        if (!safeNow) return [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (!p || p.t === 'k' || p.ghost) continue;
            if (key === 'purify' ? (p.invis && p.c !== col) : p.c !== col) continue;
            if (key === 'guardian' && p.altruist > 0) continue;
            if (key === 'bumpuku' && p.bomb) continue;
            cells.push([r, c]);
        }
    } else if (key === 'virus' || key === 'vine' || key === 'ritual') {
        if (!safeNow) return [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (isFreeCell(r, c)) cells.push([r, c]);
    } else if (key === 'generator') {
        if (!safeNow) return [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (isFreeCell(r, c)) cells.push([r, c]);
        if (cells.length < 2) return [];
    } else if (key === 'lie') {
        if (!safeNow) return [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (p && p.c === col && lieOptions(r, c, true).length) cells.push([r, c]);
        }
    } else if (key === 'groundhog') {
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            if (G.hogs.some(h => h.r === r && h.c === c)) continue;
            const p = b[r][c];
            if (!p || hiddenFor(p, col)) cells.push([r, c]);    // пустая клетка (или невидимка врага): скрыто и бесплатно
            else if (safeNow && !p.ghost) cells.push([r, c]);   // на фигуру: видно и тратит ход
        }
    } else if (key === 'superposition') {
        if (!safeNow) return [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (p && p.t !== 'k' && !p.ghost && !p.sup && !(p.invis && p.c !== col)) cells.push([r, c]);
        }
    } else if (key === 'zawarudo') {
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (p && p.c === col && !p.ghost && legalMovesAt(b, r, c).some(m => !givesCheck(b, m) && !zwCapture(b, m))) return [[r, c]];
        }
    } else if (key === 'misclick') {
        const n = HIST.length;
        if (n >= 3 && HIST[n - 1].turn === col && HIST[n - 2].turn === enemy && HIST[n - 3].turn === col) return [[0, 0]];
    } else if (key === 'timeslow') {
        return findKing(b, col) ? [[0, 0]] : [];
    } else if (key === 'trap') {
        if (!safeNow) return [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            if ((!b[r][c] || hiddenFor(b[r][c], col)) && !G.traps.some(x => x.r === r && x.c === c)) cells.push([r, c]);
        }
    } else if (key === 'lure') {
        if (!safeNow) return [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (p && !hiddenFor(p, col)) { if (p.c === col && !p.ghost && p.t !== 'k' && !p.lure) cells.push([r, c]); }
            else if (!G.lureCells.some(x => x.r === r && x.c === c)) cells.push([r, c]);
        }
    }
    return cells;
}

// Есть ли у способности хоть одна цель (перезарядка не учитывается)
function abilityPossible(col, k) {
    if (k === 'resurrect' || k === 'raise') {
        const seen = new Set();
        const cols = k === 'raise' ? ['w', 'b'] : [col];
        return cols.some(gc => G.grave[gc].some(d => {
            const key = descKey(d);
            if (seen.has(key)) return false;
            seen.add(key);
            return abilityCells(k, col, d).length > 0;
        }));
    }
    if (k === 'illusion') return abilityCells(k, col, null, true).length > 0;
    return abilityCells(k, col).length > 0;
}

// Обязательная рубка (зомби или приманка) блокирует способности, кроме Апокалипсиса
const blockedByForce = (col, k) => col === G.turn && G.forced && G.forced.length > 0 && k !== 'apocalypse';

function abilityAvailable(col, k) {
    if (G.cd[col][k] > 0) return false;
    if (G.disabled && G.disabled[col] && G.disabled[col][k] > 0) return false;      // отключено Красной обструкцией
    if (k === 'copy') {
        const eff = G.lastAb[other(col)];
        if (!eff || eff === 'misclick' || blockedByForce(col, eff)) return false;
        return abilityPossible(col, eff);
    }
    if (blockedByForce(col, k)) return false;
    return abilityPossible(col, k);
}

function hasAnyAction(col) {
    if (col === G.turn && G.forced && G.forced.length) return true;
    if (anyLegalMove(G.board, col)) return true;
    return HEROES[G.hero[col]].abilities.some(k => abilityAvailable(col, k));
}

function hasBonusMove(col) {
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const p = G.board[r][c];
        if (p && p.c === col && !p.ghost && selectableMoves(r, c).length) return true;
    }
    return false;
}

/* =====================================================================
   ХОД ИГРЫ
   ===================================================================== */
let G = null;
let selectedHeroes = { w: 'paladin', b: 'mage' };

// Ангел-хранитель: самоотверженная фигура в 3×3 от жертвы меняется с ней местами и гибнет вместо неё.
// unsafe(r, c) — клетки, где жертва тоже погибла бы (туда её не переставляем). Возвращает фигуру, которая теперь стоит на месте жертвы (и должна погибнуть), или null.
// Порядок обработки одновременно гибнущих фигур: сначала самые ценные, чтобы ангел спас именно их.
// Равные по ценности: слон раньше коня, дальше «случайно» (по состоянию партии, одинаково у обоих игроков)
function orderVictims(list) {
    const seed = (G && G.log ? G.log.length : 0) * 131;
    const key = v => [-(PIECE_VAL[v.p.t] || 0), v.p.t === 'b' ? 0 : 1, (seed + v.r * 17 + v.c * 7) % 97];
    return list.slice().sort((a, b) => { const x = key(a), y = key(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; });
}

function guardSwap(r, c, unsafe) {
    const v = G.board[r][c];
    if (!v || v.t === 'k' || v.ghost) return null;
    const gd = pickGuardian(G.board, r, c, v, null, unsafe);
    if (!gd) return null;
    const [ar, ac] = gd.from, a = gd.a;
    G.board[ar][ac] = v;
    G.board[r][c] = a;
    G.fx.push({ r: ar, c: ac, type: 'revive' });
    addLog('n', `👼 Ангел-хранитель: ${pieceSym(a)} с ${sqName(ar, ac)} меняется местами с ${pieceSym(v)} и гибнет вместо неё`);
    return a;
}

function toGrave(p) {
    if (p.t === 'j') return;      // заводные челюсти не уходят в сброс
    if (p.cap > 0) addLog('n', `🤡 Колпак слетел с ${pieceSym(p)}: фигура погибла`);
    G.deaths = (G.deaths || 0) + 1;
    G.grave[p.orig || p.c].push({ t: p.t, x: [...(p.x || [])] });
}

function startGame() {
    G = {
        board: initialBoard(), turn: 'w', hero: { ...selectedHeroes },
        grave: { w: [], b: [] }, cd: { w: {}, b: {} },
        fire: [], burn: [], traps: [], lureCells: [], conv: [], portals: [], nextPortal: 1, archUsed: false, sharp: [], pairStep: null, soulList: [],
        lastAb: { w: null, b: null },
        ep: null, sel: null, moves: [], mode: null, forced: [], forcedKind: null,
        bonus: null, noZForce: false,
        last: null, over: null, log: [], fx: [], check: null, pendingPromo: null, nextPair: 1, nextUid: 1, deaths: 0,
        cdBonus: { w: {}, b: {} }, vines: [], virus: [], rituals: [], gens: [], hogs: [], decoys: [],
        bananas: [], disabled: { w: {}, b: {} }, pretense: { w: null, b: null }, done: { w: 0, b: 0 }
    };
    HIST = [];
    ['w', 'b'].forEach(c => {
        const h = HEROES[G.hero[c]];
        h.abilities.forEach(k => { G.cd[c][k] = CONFIG.startCooldown; });
        if (CONFIG.cooldown[h.passive] !== undefined) G.cd[c][h.passive] = CONFIG.startCooldown;
        if (G.hero[c] === 'jester') G.pretense[c] = 'pending';      // Притворство: выбор предателя перед первым ходом Шута
    });
    addLog('n', `Партия началась: Белые — ${HEROES[G.hero.w].name}, Чёрные — ${HEROES[G.hero.b].name}`);
    $('#setup').classList.add('hidden');
    $('#gameover').classList.add('hidden');
    $('#promo').classList.add('hidden');
    $('#app').classList.remove('hidden');
    startTurn();
}

function addLog(c, text) { G.log.push({ c, text, n: logNo() }); }
// номер хода для записи журнала: 0 для первой записи (старт партии), дальше номер текущего хода
const logNo = () => (G.log.length ? (G.turnNo || 0) + 1 : 0);

// Ход невидимой фигуры: в журнале просто «сделала ход», подробности раскроются, когда фигура станет видимой
function logHidden(c, p, real) {
    G.log.push({ c, text: '🥷 Невидимая фигура сделала ход', hid: uidOf(p), real, n: logNo() });
}

// Плитки (сейчас только конвейеры) уничтожаются огненным шаром. Ловушки (капкан) плитками не считаются.
// Новые виды плиток добавлять сюда.
function destroyTiles(r, c) {
    [['conv', 'конвейер'], ['gens', 'плитку генератора'], ['virus', 'заражённую плитку'], ['vines', 'лозу'], ['rituals', 'призрачную плитку']].forEach(([k, name]) => {
        const n = G[k].length;
        G[k] = G[k].filter(x => !(x.r === r && x.c === c));
        if (G[k].length < n) {
            G.fx.push({ r, c, type: 'boom' });
            addLog('n', `🔥 Огонь уничтожает ${name} на ${sqName(r, c)}`);
        }
    });
}

// Снимок состояния для «Мисклик!»
function snapshot() {
    return structuredClone({ ...G, sel: null, moves: [], mode: null, forced: [], pairStep: null, pendingPromo: null, fx: [] });
}

// Пересчитать состояние текущего игрока (выбор, обязательные ходы, шах)
function computeState(c) {
    G.sel = null; G.moves = []; G.mode = null;
    G.forced = G.bonus ? [] : computeForced(c);
    if (G.bonus) G.forcedKind = null;
    const attacked = kingAttacked(G.board, c);
    const latent = !attacked && !kingSafe(G.board, c, G.fire);
    G.check = attacked ? 'check' : latent ? 'latent' : null;
    return { attacked, latent };
}

// Удар Сёмен-ути: все фигуры на вертикали погибают (кроме королей и фигур под барьером Мага)
function shomenStrike(f, owner) {
    const dead = [], vic = [];
    for (let rr = 0; rr < 8; rr++) {
        const q = G.board[rr][f.c];
        G.fx.push({ r: rr, c: f.c, type: 'arrowhit' });
        if (!q || magicProof(G.board, rr, f.c)) continue;
        if (q.ghost) { vanishGhost(rr, f.c, 'удар Сёмен-ути'); continue; }
        vic.push({ r: rr, c: f.c, p: q });
    }
    orderVictims(vic).forEach(({ r: rr }) => {
        const q = G.board[rr][f.c];
        if (!q) return;
        const dq = guardSwap(rr, f.c, (ar, ac) => ac === f.c) || q;
        G.board[rr][f.c] = null;
        toGrave(dq);
        dead.push(`${pieceSym(dq)}${sqName(rr, f.c)}`);
    });
    sfx('boom');
    addLog(owner, `⚔️ Сёмен-ути по вертикали ${'abcdefgh'[f.c]}: ${dead.length ? 'погибли ' + dead.join(', ') : 'никого не задело'}`);
}

// Бумпуку: бомбы игрока, чей ход начинается, приближаются к взрыву
function bombStep(c) {
    const found = [];
    G.board.forEach((row, r) => row.forEach((p, cc) => { if (p && p.bomb && p.bombBy === c) found.push([r, cc, p]); }));
    found.forEach(([r, cc, p]) => {
        if (G.board[r][cc] !== p) return;
        p.bomb--;
        if (p.bomb > 0) return;
        const dead = [], vic = [];
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            const rr = r + dr, c2 = cc + dc;
            if (!inb(rr, c2)) continue;
            G.fx.push({ r: rr, c: c2, type: 'boom' });
            const q = G.board[rr][c2];
            if (!q || magicProof(G.board, rr, c2)) continue;
            if (q.ghost) { vanishGhost(rr, c2, 'взрыв', true); continue; }
            vic.push({ r: rr, c: c2, p: q });
        }
        orderVictims(vic).forEach(({ r: rr, c: c2 }) => {
            const q = G.board[rr][c2];
            if (!q) return;
            const dq = guardSwap(rr, c2, (ar, ac) => Math.abs(ar - r) <= 1 && Math.abs(ac - cc) <= 1) || q;
            G.board[rr][c2] = null;
            toGrave(dq);
            dead.push(`${pieceSym(dq)}${sqName(rr, c2)}`);
        });
        if (G.board[r][cc] === p) { delete p.bomb; delete p.bombBy; }
        sfx('boom');
        addLog(c, `💣 Бумпуку: взрыв на ${sqName(r, cc)}: ${dead.length ? 'погибли ' + dead.join(', ') : 'никого не задело'}`);
    });
}

function startTurn() {
    const c = G.turn;
    G.noZForce = false;
    G.bonus = null;
    G.archUsed = false;
    G.pairStep = null;

    // 1. Взрываются огненные шары и прилетают стрелы игрока, чей ход начинается
    const mine = G.fire.filter(f => f.owner === c);
    G.fire = G.fire.filter(f => f.owner !== c);
    const hitVal = f => { const q = f.kind === 'shomen' ? null : G.board[f.r][f.c]; return q && !q.ghost ? (PIECE_VAL[q.t] || 0) : 0; };
    mine.sort((a, b) => hitVal(b) - hitVal(a));      // сначала то, что бьёт самые ценные фигуры: ангел спасёт их
    mine.forEach(f => {
        if (f.kind === 'shomen') { shomenStrike(f, c); return; }
        const arrow = f.kind === 'arrow';
        const name = arrow ? '🏹 Стрела' : '💥 Взрыв';
        const sq = sqName(f.r, f.c);
        const p = G.board[f.r][f.c];
        G.fx.push({ r: f.r, c: f.c, type: arrow ? 'arrowhit' : 'boom' });
        sfx(arrow ? 'arrow' : 'boom');
        if (!p) addLog(c, `${name} на ${sq}: там никого нет`);
        else if (magicProof(G.board, f.r, f.c, c, !arrow)) addLog(c, `${name} на ${sq}: цель неуязвима для магии`);
        else if (p.ghost) {
            vanishGhost(f.r, f.c, arrow ? 'стрела' : 'огонь');
            addLog(c, `${name} на ${sq}`);
        } else {
            const dp = guardSwap(f.r, f.c) || p;
            G.board[f.r][f.c] = null;
            toGrave(dp);
            addLog(c, `${name} на ${sq} уничтожает ${pieceSym(dp)} (${colorName(dp.orig || dp.c).toLowerCase()})`);
        }
        if (!arrow) { destroyTiles(f.r, f.c); burnTile(f.r, f.c, c); }       // клетка продолжает гореть
    });
    bombStep(c);
    soulSync();
    checkIllusions();

    // 2. Перезарядка способностей
    Object.keys(G.cd[c]).forEach(k => { if (G.cd[c][k] > 0) G.cd[c][k]--; });

    // 3. Состояние партии
    const { attacked, latent } = computeState(c);

    const total = G.board.flat().filter(p => p && !p.ghost).length;
    const canRevive = ['w', 'b'].some(x =>
        (G.hero[x] === 'paladin' && G.grave[x].length) ||
        (G.hero[x] === 'necromancer' && (G.grave.w.length + G.grave.b.length)));

    if (!hasAnyAction(c)) {
        G.over = (attacked || latent)
            ? { winner: other(c), title: 'Мат!', text: `${colorName(other(c))} побеждают.` }
            : { winner: null, title: 'Пат', text: 'У игрока нет возможных действий. Ничья.' };
    } else if (total === 2 && !canRevive) {
        G.over = { winner: null, title: 'Ничья', text: 'На доске остались только короли.' };
    }

    if (!G.over) startPretenseIfNeeded(c);
    HIST.push({ turn: c, state: snapshot() });
    if (HIST.length > 8) HIST.shift();

    render();
    if (G.over) showGameOver();
}

// Продолжение хода того же игрока (доп. ход Жатвы, обычный ход после Апокалипсиса)
function continueTurn() {
    const c = G.turn;
    checkIllusions();
    computeState(c);
    if (G.archUsed) {                         // Архитектор: только способности, пока они есть
        if (!HEROES[G.hero[c]].abilities.some(k => abilityAvailable(c, k))) { endTurn(); return; }
        render();
        return;
    }
    const can = G.bonus ? hasBonusMove(c) : hasAnyAction(c);
    if (!can) {
        if (G.check) {
            G.over = { winner: other(c), title: 'Мат!', text: `${colorName(other(c))} побеждают.` };
            render(); showGameOver();
        } else endTurn();
        return;
    }
    render();
}

// Горящие клетки сжигают фигуры, оказавшиеся на них (поставленные способностями, например)
function sweepBurn() {
    const ord = orderVictims(G.burn.filter(t => { const q = G.board[t.r][t.c]; return q && !q.ghost; }).map(t => ({ r: t.r, c: t.c, p: G.board[t.r][t.c], t })));
    const rest = G.burn.filter(t => !ord.some(v => v.t === t));
    [...ord.map(v => v.t), ...rest].forEach(t => {
        const p = G.board[t.r][t.c];
        if (!p || magicProof(G.board, t.r, t.c, t.owner, true)) return;
        if (p.ghost) { vanishGhost(t.r, t.c, 'огонь'); return; }
        const dp = guardSwap(t.r, t.c, (ar, ac) => G.burn.some(x => x.r === ar && x.c === ac)) || p;
        G.board[t.r][t.c] = null;
        toGrave(dp);
        G.fx.push({ r: t.r, c: t.c, type: 'boom' });
        sfx('boom');
        addLog('n', `🔥 ${pieceSym(dp)} сгорает на ${sqName(t.r, t.c)}`);
    });
}

// Фигура, вставшая на капкан, пропускает следующий ход своей стороны
function sweepTraps() {
    G.traps = G.traps.filter(t => {
        const p = G.board[t.r][t.c];
        if (!p || p.t === 'k' || p.ghost) return true;
        if (p.warded > 0) {      // Очищение: фигура давит капкан без последствий
            addLog('n', p.invis ? '✴ Невидимая фигура под Очищением уничтожает капкан' : `✴ ${pieceSym(p)} под Очищением уничтожает капкан на ${sqName(t.r, t.c)}`);
            return false;
        }
        p.snared = 1;
        if (!p.invis) G.fx.push({ r: t.r, c: t.c, type: 'trap' });
        sfx('trap');
        addLog('n', p.invis ? '🪤 Невидимая фигура попадает в капкан' : `🪤 ${pieceSym(p)} попадает в капкан на ${sqName(t.r, t.c)}`);
        return false;
    });
}

// Вирус: фигура (не король), вставшая на заражённую плитку, становится зомби
function sweepVirus() {
    G.virus = G.virus.filter(v => {
        const p = G.board[v.r][v.c];
        if (!p || p.t === 'k' || p.ghost || magicProof(G.board, v.r, v.c)) return true;
        p.zombie = true;
        G.fx.push({ r: v.r, c: v.c, type: 'raise' });
        sfx('raise');
        addLog('n', p.invis ? '☣️ Невидимая фигура заражена и становится зомби' : `☣️ ${pieceSym(p)} на ${sqName(v.r, v.c)} заражена и становится зомби`);
        return false;
    });
}

// Лоза исчезает, когда на неё наступает фигура
function sweepVines() {
    G.vines = G.vines.filter(v => { const p = G.board[v.r][v.c]; return !(p && !p.ghost); });
}

// Генератор: если на плюсе и на минусе стоят фигуры, их убивает разряд
function sweepGens() {
    if (!G.gens.length) return;
    const occ = sign => G.gens.filter(g => g.sign === sign && G.board[g.r][g.c] && !G.board[g.r][g.c].ghost);
    const plus = occ('+'), minus = occ('-');
    if (!plus.length || !minus.length) return;
    orderVictims([...plus, ...minus].map(g => ({ r: g.r, c: g.c, p: G.board[g.r][g.c], g }))).map(v => v.g).forEach(g => {
        const p = G.board[g.r][g.c];
        if (!p || magicProof(G.board, g.r, g.c)) return;
        const dp = guardSwap(g.r, g.c, (ar, ac) => G.gens.some(x => x.r === ar && x.c === ac)) || p;
        G.board[g.r][g.c] = null;
        toGrave(dp);
        G.fx.push({ r: g.r, c: g.c, type: 'boom' });
        sfx('zap');
        addLog('n', `⚡ Генератор: ${pieceSym(dp)} на ${sqName(g.r, g.c)} поражена разрядом`);
    });
}

// Своя фигура встала на приманку: приманка остаётся на ней. Чужая: приманка съедена.
function sweepLures() {
    G.lureCells = G.lureCells.filter(l => {
        const p = G.board[l.r][l.c];
        if (!p || p.ghost) return true;
        if (p.c === l.owner && !p.orig && p.t !== 'k') p.lure = l.owner;
        return false;
    });
}

// Острая клетка (или null): клетки, на которых при применении стояли фигуры, острыми не становятся
const sharpAt = (r, c) => G.sharp.find(z => (r + c) % 2 === z.parity && !z.skip.includes(r + ',' + c)) || null;

// Острые клетки Самурая убивают фигуры, оказавшиеся на них, потом исчезают
function sweepSharp() {
    G.sharp.forEach(z => {
        const vic = [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            if ((r + c) % 2 !== z.parity || z.skip.includes(r + ',' + c)) continue;
            const p = G.board[r][c];
            if (!p || p.t === 'k' || magicProof(G.board, r, c)) continue;
            if (p.ghost) { vanishGhost(r, c, 'острая клетка'); continue; }
            vic.push({ r, c, p });
        }
        orderVictims(vic).forEach(({ r, c }) => {
            const p = G.board[r][c];
            if (!p) return;
            const dp = guardSwap(r, c, (ar, ac) => (ar + ac) % 2 === z.parity && !z.skip.includes(ar + ',' + ac)) || p;
            G.board[r][c] = null;
            toGrave(dp);
            G.fx.push({ r, c, type: 'boom' });
            sfx('capture');
            addLog('n', `🗡 ${pieceSym(dp)} гибнет на острой клетке ${sqName(r, c)}`);
        });
        z.left--;
    });
    const before = G.sharp.length;
    G.sharp = G.sharp.filter(z => z.left > 0);
    if (G.sharp.length < before) addLog('n', '🗡 Острые клетки исчезли');
}

function endTurn() {
    const c = G.turn;
    if (!G.done) G.done = { w: 0, b: 0 };
    G.done[c]++;
    if (G.done[c] === CONFIG.betrayAfter && G.board.some(row => row.some(q => q && q.betray === other(c)))) addLog('n', '🃏 Одна из фигур готова предавать');
    soulSync();
    G.bonus = null;
    G.noZForce = false;
    G.archUsed = false;
    G.pairStep = null;
    G.board.forEach((row, r) => row.forEach((p, cc) => {
        if (!p) return;
        // Заводные челюсти живут ограниченное число ходов владельца
        if (p.t === 'j' && p.c === c) {
            p.life--;
            if (p.life <= 0) { G.board[r][cc] = null; G.fx.push({ r, c: cc, type: 'poof' }); addLog('n', `🦷 Заводные челюсти на ${sqName(r, cc)} ломаются и рассыпаются`); return; }
        }
        // Шутовской колпак слетает на ходе врага
        // Колпак висит на первых ходах врага; когда ход в очередной раз переходит к врагу, последний срок вышел, и колпак слетает ещё до его хода
        if (p.cap > 0 && p.capBy) {
            if (p.capBy !== c) p.cap--;
            if (p.capBy === c ? p.cap <= 1 : p.cap <= 0) { delete p.cap; delete p.capBy; addLog('n', `🤡 Колпак слетел с ${pieceSym(p)} на ${sqName(r, cc)}: время вышло`); }
        }
        // Заморозка и капкан спадают в конце хода владельца фигуры
        if (p.c === c && p.frozen > 0) p.frozen--;
        if (p.c === c && p.snared > 0) p.snared--;
        if (p.c === c && p.altruist > 0) { p.altruist--; if (!p.altruist) delete p.altruist; }
        if (p.c === c && p.warded > 0) { p.warded--; if (!p.warded) delete p.warded; }
        if (p.c === c && p.scaredT > 0) {
            p.scaredT--;
            if (!p.scaredT) { delete p.scared; delete p.scaredT; if (!p.invis) addLog('n', `😱 Пешка на ${sqName(r, cc)} больше не боится`); }
        }
        if (p.c === c && p.shield > 0) {
            p.shield--;
            if (!p.shield) addLog('n', `🛡 Щит ${pieceSym(p)} на ${sqName(r, cc)} рассеялся`);
        }
        // Гипноз спадает в конце хода гипнотизёра
        if (p.hypno && p.c === c) {
            if (p.fresh) delete p.fresh;
            else {
                p.hypno--;
                if (p.hypno <= 0) {
                    addLog('n', `🌀 ${pieceSym(p)} на ${sqName(r, cc)} вырывается из-под гипноза`);
                    p.c = p.orig;
                    delete p.orig; delete p.hypno;
                }
            }
        }
    }));
    applyEffects(G.board, true);
    sweepBananas();
    sweepBurn();
    sweepTraps();
    sweepVirus();
    sweepVines();
    sweepLures();
    sweepSharp();
    sweepGens();
    G.vines.forEach(v => { if (v.owner === c) v.left--; });
    G.vines = G.vines.filter(v => v.left > 0);
    Object.keys(G.disabled[c] || {}).forEach(k => {      // Красная обструкция: отключение спадает в конце ходов самого игрока
        G.disabled[c][k]--;
        if (G.disabled[c][k] <= 0) { delete G.disabled[c][k]; addLog('n', `🍅 Способность «${(ABILITIES[k] || PASSIVES[k]).name}» снова работает`); }
    });
    soulSync();
    G.burn.forEach(t => { if (t.owner === c) t.life--; });      // горит столько ходов, сколько ходов у мага
    G.burn = G.burn.filter(t => t.life > 0);
    revealLies(c);
    checkInvis();
    checkIllusions();
    G.turn = other(c);
    G.turnNo = (G.turnNo || 0) + 1;
    startTurn();
}

function tryMove(mv, ctx) {
    if (mv.decoy) { if (!mv.redirect) return; mv = mv.redirect; }   // «сквозь» невидимую фигуру: на деле рубка её (или ход невозможен)
    ctx = ctx || (G.bonus ? { bonus: true, zw: G.bonus.kind === 'zw' ? G.bonus.step : 0 } : {});
    G.sel = null; G.moves = [];
    if (mv.promo) {
        const victim = G.board[mv.tr][mv.tc];
        if (!(victim && victim.shield && !supOpen(G.board, victim))) { showPromo(mv, ctx); return; }
    }
    executeMove(mv, 'q', ctx);
}

// Король после шаха создаёт иллюзию (пассивка Экстрасенса)
function makeKingGhost(kr, kc, br, bc, realText, ghostText) {
    const k = G.board[kr][kc];
    const id = G.nextPair++;
    k.pair = id;
    G.board[br][bc] = { ...k, ghost: true, pair: id, moved: true };
    G.fx.push({ r: br, c: bc, type: 'ghost' }, { r: kr, c: kc, type: 'ghost' });   // оба короля появляются одновременно
    sfx('illusion');
    G.last = null;                                  // подсветка не должна выдавать настоящего короля
    const parts = [realText, ghostText];            // оба хода в одной строке, порядок случайный
    if (rnd() < 0.5) parts.reverse();
    addLog(G.turn, parts.join(' и '));
    addLog('n', '👀 Двоится в глазах: король оставил свою иллюзию');
}

function executeMove(mv, promo, ctx) {
    ctx = ctx || {};
    const b = G.board, p = b[mv.fr][mv.fc], col = p.c;
    const sym = pieceSym(p), note = p.t === 'p' ? '' : sym;
    const from = sqName(mv.fr, mv.fc), to = sqName(mv.tr, mv.tc);
    const wasGhost = !!p.ghost, pair = p.pair;
    const extra = !!(ctx.bonus || ctx.apo || ctx.pairSecond);
    let skipMate = false;                       // иллюзия короля при рождении не делает хода

    // Пассивка Экстрасенса: куда ещё мог уйти король из-под шаха
    let kgAlt = null;
    if (p.t === 'k' && !wasGhost && !p.pair && G.check && !extra && !mv.castle && G.hero[col] === 'hypnotist') {
        kgAlt = legalMovesAt(b, mv.fr, mv.fc)
            .filter(m => !m.castle && !m.ep && !b[m.tr][m.tc] && !(m.tr === mv.tr && m.tc === mv.tc));
    }

    const res = applyMove(b, mv, promo);
    if (ctx.restoreC) p.c = ctx.restoreC;                 // Апокалипсис: чужой зомби возвращается к своему цвету
    const own = res.dead.find(d => d !== p && d.c === col && !d.ghost);   // срубленная своя фигура
    const cap = res.dead.some(d => d !== p && d.c !== col);
    if (ctx.pairSecond) G.pairStep = null;
    res.dead.forEach(d => { if (!d.ghost) toGrave(d); });
    res.vanished.forEach(({ r, c, g }) => {
        const o = findOriginal(g.pair);
        if (o) delete o.p.pair;
        G.fx.push({ r, c, type: 'poof' });
        sfx('poof');
        addLog('n', `🎭 Иллюзия на ${sqName(r, c)} рассеялась (своя фигура)`);
    });

    // Иллюзии: двойник больше не повторяет ходы, но превращение оригинала его рассеивает
    if (wasGhost && res.burned && pair) { const o = findOriginal(pair); if (o) delete o.p.pair; }
    if (!wasGhost && pair && mv.promo && !res.thorn && !res.burned) {
        const gi = findGhost(pair);
        if (gi) vanishGhost(gi.r, gi.c, 'оригинал изменился');
    }

    // Оригинал срубил фигуру или дал шах: его иллюзия рассеивается
    if (!wasGhost && pair && !res.thorn && !res.burned && (cap || own || kingAttacked(b, other(col)))) {
        const gi = findGhost(pair);
        if (gi) vanishGhost(gi.r, gi.c, cap || own ? 'оригинал срубил фигуру' : 'оригинал дал шах');
    }

    // Король ушёл из-под шаха: куда можно поставить его иллюзию
    let kgBs = [];
    if (kgAlt && !res.thorn && !res.burned) {
        const seen = new Set();
        kgBs = kgAlt.filter(m => {
            const k = m.tr * 8 + m.tc;
            if (seen.has(k)) return false;
            seen.add(k);
            return ghostViable(b, m.tr, m.tc, p, mv.tr, mv.tc);
        });
    }
    if (p.soul) { const e = G.soulList.find(x => x.p === p); if (e) e.pos = [mv.tr, mv.tc]; }

    let text;
    if (mv.castle) text = mv.tc === 6 ? 'O-O' : 'O-O-O';
    else {
        text = `${note}${from}${cap || own ? '×' : '–'}${to}`;
        if (mv.promo && !res.thorn && !res.burned) text += '=' + SYM[promo];
        if (mv.ep) text += ' (на проходе)';
    }
    if (res.capBack) {
        text += res.capSaved ? ` 🤡 колпак слетел с ${pieceSym(res.capBack)} на ${to}: ${sym} осталась жива` : res.guard ? ` 🤡 колпак слетел с ${pieceSym(res.capBack)} на ${to}: ${sym} должна была погибнуть` : ` 🤡 колпак слетел с ${pieceSym(res.capBack)} на ${to}: ${sym} погибла`;
        G.fx.push({ r: mv.tr, c: mv.tc, type: 'boom' });
        sfx('thorn');
    } else if (res.thorn) {
        text += ` 🌵 шипы уничтожили ${sym}`;
        G.fx.push({ r: mv.tr, c: mv.tc, type: 'thorn' });
        sfx('thorn');
    } else if (res.burned) {
        text += res.supKill ? ` ⚛ ${sym} срублена вернувшейся фигурой` : res.saved ? (res.sharp ? ' 🗡 острая клетка' : ' 🔥 горящая клетка') : res.sharp ? ` 🗡 ${sym} погиб на острой клетке` : ` 🔥 ${sym} сгорел в огне`;
        G.fx.push({ r: mv.tr, c: mv.tc, type: 'boom' });
        sfx('boom');
    } else {
        G.fx.push({ r: mv.tr, c: mv.tc, type: kgBs.length ? 'ghost' : 'land' });
        sfx(kgBs.length ? 'illusion' : (cap || own ? 'capture' : 'move'));
    }

    const harvest = !!(own && own.t === 'p' && !res.thorn && !res.burned && !extra && G.hero[col] === 'necromancer');
    if (harvest) text += ' 🌾';

    G.ep = (mv.double && !wasGhost) ? { r: (mv.fr + mv.tr) / 2, c: mv.fc, pr: mv.tr, pc: mv.tc } : null;
    const hideMove = !!p.invis && !res.thorn && !res.burned;      // ход невидимой фигуры не выдаём
    G.last = (kgBs.length || hideMove) ? null : { fr: mv.fr, fc: mv.fc, tr: mv.tr, tc: mv.tc };
    if (!kgBs.length) { if (hideMove) logHidden(col, p, text); else addLog(col, text); }
    if (res.released) addLog('n', `🌀 ${sym} срубила фигуру и вырывается из-под гипноза`);
    if (res.guard) {
        const gd = res.guard;
        G.fx.push({ r: gd.from[0], c: gd.from[1], type: 'revive' });
        addLog('n', `👼 Ангел-хранитель: ${pieceSym(gd.a)} с ${sqName(gd.from[0], gd.from[1])} меняется местами с ${pieceSym(gd.v)} и гибнет вместо неё`);
    }
    (res.supBack || []).forEach(({ q, from: f0, to: t0 }) => {
        G.fx.push({ r: f0[0], c: f0[1], type: 'poof' }, { r: t0[0], c: t0[1], type: 'ghost' });
        sfx('illusion');
        addLog('n', `⚛ Суперпозиция: ${pieceSym(q)} с ${sqName(f0[0], f0[1])} возвращается на ${sqName(t0[0], t0[1])}`);
    });
    if (p.invis && cap && !res.thorn && !res.burned) revealPiece(mv.tr, mv.tc, 'она срубила фигуру');

    // Король ушёл из-под шаха: оставляет иллюзию
    if (kgBs.length === 1) {
        skipMate = true;
        makeKingGhost(mv.tr, mv.tc, kgBs[0].tr, kgBs[0].tc, text, `${note}${from}–${sqName(kgBs[0].tr, kgBs[0].tc)}`);
    } else if (kgBs.length > 1) {
        G.fx = G.fx.filter(x => !(x.r === mv.tr && x.c === mv.tc));   // до выбора клетки не выдаём, куда ушёл король
        G.sel = null; G.moves = [];
        G.mode = { type: 'kghost', locked: true, from: [mv.tr, mv.tc], to: [mv.tr, mv.tc], orig: [mv.fr, mv.fc], kp: { ...p }, cells: kgBs.map(m => [m.tr, m.tc]), text, note, fromSq: from };
        render();
        return;                                     // ход закончится после выбора клетки
    }

    const tail = () => {
        // Апокалипсис: зомби сходил вне очереди, обычный ход ещё впереди
        if (ctx.apo) {
            G.cd[col][ctx.cdKey] = cdOf(col, ctx.cdKey);
            G.lastAb[col] = 'apocalypse';
            G.noZForce = true;
            addLog('n', '☠️ Апокалипсис: обязательная рубка зомби отменена до конца хода');
            continueTurn();
            return;
        }

        // ZA WARUDO: первый ход сделан (без шаха), впереди второй
        if (ctx.zw === 1) {
            G.bonus = { kind: 'zw', step: 2 };
            addLog('n', '🕰️ ZA WARUDO: второй ход');
            continueTurn();
            return;
        }

        // Жатва: срубили свою пешку
        if (harvest) {
            sfx('harvest');
            if (kingAttacked(b, other(col))) {
                Object.keys(G.cd[col]).forEach(k => { if (G.cd[col][k] > 0) G.cd[col][k]--; });
                addLog('n', '🌾 Жатва с шахом: перезарядка способностей −1, доп. хода нет');
                endTurn();
            } else {
                G.bonus = { kind: 'harvest' };
                addLog('n', '🌾 Жатва: дополнительный ход');
                continueTurn();
            }
            return;
        }

        endTurn();
    };

    // Иллюзия: оригинал и двойник ходят вместе, вторая фигура пары обязана сходить следом
    if (ctx.pairSecond) { ctx.tail(); return; }
    const mate = !skipMate && p.pair && !res.thorn && !res.burned ? (wasGhost ? findOriginal(p.pair) : findGhost(p.pair)) : null;
    if (mate) {
        G.forced = [];
        G.sel = null; G.moves = [];
        if (selectableMoves(mate.r, mate.c).length) {
            G.pairStep = { r: mate.r, c: mate.c, tail };
            render();
            return;
        }
    }
    tail();
}

/* ---------- Ход — это ложь (Экстрасенс) ---------- */
// Настоящий ход (невидимая фигура) и фейковый (иллюзия): оба обычные ходы этой фигуры, без дополнительных ограничений.
// Раскрытие невидимости и рассеивание иллюзии идут по обычным правилам: ошибка игрока считается зевком.
function lieOptions(r, c, first) {
    const b = G.board, p = b[r][c], res = [];
    if (!p || p.ghost || p.pair || p.frozen > 0 || p.snared > 0 || p.t === 'k' || p.orig || p.invis || p.lie) return res;
    const moves = legalMovesAt(b, r, c).filter(m => !m.promo && !m.castle && !m.ep);
    const empties = moves.filter(m => !b[m.tr][m.tc]);
    for (const R of moves) {
        const nb = cloneBoard(b);
        const sim = applyMove(nb, R, 'q');
        if (sim.burned || sim.thorn) continue;
        const Fs = empties.filter(F => !(F.tr === R.tr && F.tc === R.tc));
        if (Fs.length) { res.push({ R, Fs }); if (first) return res; }
    }
    return res;
}

function doLie(from, R, F) {
    const b = G.board, p = b[from[0]][from[1]], col = p.c;
    const note = p.t === 'p' ? '' : pieceSym(p), fromS = sqName(from[0], from[1]);
    const id = G.nextPair++;
    const ghost = { ...p, x: [...(p.x || [])], ghost: true, pair: id, moved: true, lieOf: uidOf(p) };
    delete ghost.soul; delete ghost.scared; delete ghost.uid;
    const res = applyMove(b, R, 'q');
    res.dead.forEach(d => { if (!d.ghost) toGrave(d); });
    const cap = res.dead.some(d => d !== p && d.c !== col);
    p.pair = id;
    p.invis = true; p.lie = true; p.lieFake = [F.tr, F.tc];
    b[F.tr][F.tc] = ghost;                          // фейк: обычная иллюзия со всеми условиями рассеивания
    G.ep = null;
    const lieKey = G.mode && G.mode.via ? G.mode.via : 'lie';      // через зеркало перезарядка уходит на кнопку зеркала
    G.cd[col][lieKey] = cdOf(col, lieKey);
    G.fx.push({ r: F.tr, c: F.tc, type: 'land' });
    sfx('move');
    G.last = { fr: from[0], fc: from[1], tr: F.tr, tc: F.tc };
    addLog(col, `${note}${fromS}–${sqName(F.tr, F.tc)}`);       // в журнале виден только фейковый ход
    G.mode = null;
    if (cap) revealLie(R.tr, R.tc);                 // рубка выдаёт невидимую фигуру сразу
    endTurn();
}

function removeDecoys(p) {
    G.board.forEach((row, r) => row.forEach((g, c) => {
        if (g && g.ghost && g.lieOf === p.uid) { G.board[r][c] = null; G.fx.push({ r, c, type: 'poof' }); }
    }));
}

function revealLie(r, c) {
    const p = G.board[r][c], fk = p.lieFake || [r, c];
    removeDecoys(p);
    delete p.invis; delete p.lie; delete p.lieFake; delete p.pair;
    G.lastAb[p.c] = 'lie';      // правда раскрыта: теперь это заклинание видно, и зеркало Мага может его повторить
    G.fx.push({ r, c, type: 'ghost' });
    sfx('poof');
    addLog('n', `🤥 Ход — это ложь: ${pieceSym(p)} на самом деле на ${sqName(r, c)} (показывали ${sqName(fk[0], fk[1])})`);
}

// После хода врага правда раскрывается
function revealLies(c) {
    G.board.forEach((row, r) => row.forEach((p, cc) => { if (p && p.lie && p.c !== c) revealLie(r, cc); }));
    G.board.forEach((row, r) => row.forEach((g, cc) => {      // иллюзии, оставшиеся без владельца
        if (g && g.ghost && g.lieOf && g.c !== c) { G.board[r][cc] = null; G.fx.push({ r, c: cc, type: 'poof' }); }
    }));
}

// Ходы зомби под управлением Апокалипсиса: чужой зомби ходит как фигура игрока (рубит свои же фигуры)
function zombieMoves(r, c, col) {
    const p = G.board[r][c];
    if (p.c === col) return legalMovesAt(G.board, r, c);
    const o = p.c;
    p.c = col;
    try { return legalMovesAt(G.board, r, c); } finally { p.c = o; }
}

function finishAbility(key, text) {
    const col = G.turn;
    const cdKey = G.mode && G.mode.via ? G.mode.via : key;
    G.cd[col][cdKey] = cdOf(col, cdKey);
    G.lastAb[col] = key;
    addLog(col, text);
    if (key === 'fenyan' || key === 'ritual' || key === 'bumpuku') { continueTurn(); return; }   // свободное действие: после него обычный ход
    G.ep = null;
    if (G.hero[col] === 'architect') {      // пассивка «Мастер на все руки»: способности не заканчивают ход
        G.archUsed = true;
        continueTurn();
        return;
    }
    endTurn();
}

function useAbility(key, r, c, ref) {
    const col = G.turn, A = ABILITIES[key];
    const target = G.board[r][c];
    let text = '';
    G.last = null;

    if (key === 'resurrect' || key === 'raise') {
        const d = G.grave[ref.col].splice(ref.idx, 1)[0];
        G.board[r][c] = { ...mk(d.t, col), x: [...(d.x || [])], moved: true, zombie: key === 'raise' };
        text = `${A.icon} ${A.name}: ${pieceSym(d)} ${key === 'raise' ? 'встаёт зомби' : 'возвращается'} на ${sqName(r, c)}`;
        G.fx.push({ r, c, type: key === 'raise' ? 'raise' : 'revive' });
        sfx(key === 'raise' ? 'raise' : 'revive');
    } else if (key === 'guardian') {
        target.altruist = CONFIG.guardianTurns + 1;
        text = `${A.icon} ${A.name}: ${pieceSym(target)} ${sqName(r, c)} самоотверженна (${CONFIG.guardianTurns} ${plural(CONFIG.guardianTurns)})`;
        G.fx.push({ r, c, type: 'shield' });
        sfx('shield');
    } else if (key === 'purify') {
        if (target.lie) revealLie(r, c);
        if (target.hypno && target.orig) target.c = target.orig;            // гипноз тоже снимается
        if (target.cap > 0) addLog('n', `🤡 Колпак слетел с ${pieceSym(target)} на ${sqName(r, c)} (Очищение)`);
        ['cap', 'capBy', 'betray', 'scared', 'scaredT', 'zombie', 'shield', 'altruist', 'sup', 'lure', 'hypno', 'orig', 'fresh', 'bomb', 'bombBy', 'invis', 'phase', 'x', 'warded'].forEach(f => { delete target[f]; });
        target.frozen = 0; target.snared = 0; target.shield = false;
        if (target.soul) { delete target.soul; G.soulList = G.soulList.filter(e => e.p !== target); }
        target.warded = CONFIG.wardTurns + 1;
        text = `${A.icon} ${A.name}: ${pieceSym(target)} ${sqName(r, c)} очищена и защищена от магии (${CONFIG.wardTurns} ${plural(CONFIG.wardTurns)})`;
        G.fx.push({ r, c, type: 'shield' });
        sfx('shield');
    } else if (key === 'virus') {
        G.virus.push({ r, c, owner: col });
        text = `${A.icon} ${A.name}: заражённая плитка на ${sqName(r, c)}`;
        G.fx.push({ r, c, type: 'cast' });
        sfx('raise');
    } else if (key === 'vine') {
        G.vines.push({ r, c, owner: col, left: CONFIG.vineTurns + 1 });   // +1: в конце этого же хода счётчик уменьшится
        text = `${A.icon} ${A.name}: лоза на ${sqName(r, c)}`;
        G.fx.push({ r, c, type: 'cast' });
        sfx('trap');
    } else if (key === 'ritual') {
        G.rituals.push({ r, c, owner: col });
        text = `${A.icon} ${A.name}: призрачная плитка на ${sqName(r, c)}`;
        G.fx.push({ r, c, type: 'ghost' });
        sfx('illusion');
    } else if (key === 'bumpuku') {
        target.bomb = CONFIG.bumpukuTurns;
        target.bombBy = col;
        text = target.invis ? `${A.icon} ${A.name}: бомба повешена на невидимую фигуру`
            : `${A.icon} ${A.name}: бомба на ${pieceSym(target)} ${sqName(r, c)} (взрыв на ${CONFIG.bumpukuTurns}-м вашем ходу)`;
        if (!target.invis) G.fx.push({ r, c, type: 'cast' });
        sfx('cast');
    } else if (key === 'superposition') {
        target.sup = true;
        text = `${A.icon} ${A.name}: ${pieceSym(target)} ${sqName(r, c)} в суперпозиции`;
        G.fx.push({ r, c, type: 'ghost' });
        sfx('illusion');
    } else if (key === 'shield') {
        target.shield = CONFIG.shieldTurns + 1;   // +1: в конце этого же хода счётчик уменьшится
        text = `${A.icon} ${A.name} на ${pieceSym(target)} ${sqName(r, c)} (${CONFIG.shieldTurns} ${plural(CONFIG.shieldTurns)})`;
        G.fx.push({ r, c, type: 'shield' });
        sfx('shield');
    } else if (key === 'fireball') {
        G.fire.push({ r, c, owner: col, kind: 'fire' });
        text = `${A.icon} ${A.name} нацелен на ${sqName(r, c)} (взрыв в начале вашего следующего хода)`;
        G.fx.push({ r, c, type: 'cast' });
        sfx('cast');
    } else if (key === 'arrow') {
        G.fire.push({ r, c, owner: col, kind: 'arrow' });
        text = `${A.icon} ${A.name} нацелена на ${sqName(r, c)} (прилетит в начале вашего следующего хода)`;
        G.fx.push({ r, c, type: 'cast' });
        sfx('arrow');
    } else if (key === 'blunder') {
        target.cap = CONFIG.capTurns; target.capBy = col;
        text = `${A.icon} ${A.name}: на одну из фигур надет шутовской колпак (на какую, знает только Шут)`;
        sfx('trap');
    } else if (key === 'jaws') {
        G.board[r][c] = { ...mk('j', col), moved: true, life: CONFIG.jawsTurns + 1 };
        text = `${A.icon} ${A.name}: на ${sqName(r, c)} появляются челюсти (живут ${CONFIG.jawsTurns} ${plural(CONFIG.jawsTurns)})`;
        G.fx.push({ r, c, type: 'revive' });
        sfx('revive');
    } else if (key === 'trap') {
        G.traps.push({ r, c, owner: col });
        text = `${A.icon} ${A.name}: капкан установлен (место скрыто)`;
        sfx('trap');
    } else if (key === 'lure') {
        if (target) {
            target.lure = col;
            text = `${A.icon} ${A.name} цепляется на ${pieceSym(target)} ${sqName(r, c)}`;
        } else {
            G.lureCells.push({ r, c, owner: col });
            text = `${A.icon} ${A.name} лежит на ${sqName(r, c)}`;
        }
        G.fx.push({ r, c, type: 'cast' });
        sfx('cast');
    } else if (key === 'shomen') {
        G.fire.push({ r: -1, c, owner: col, kind: 'shomen' });
        for (let rr = 0; rr < 8; rr++) G.fx.push({ r: rr, c, type: 'cast' });
        text = `${A.icon} ${A.name} нацелен на вертикаль ${'abcdefgh'[c]} (удар в начале вашего следующего хода)`;
        sfx('cast');
    } else if (key === 'phase') {
        target.phase = true;
        text = `${A.icon} ${A.name}: ${pieceSym(target)} ${sqName(r, c)} стала прозрачной для своих`;
        G.fx.push({ r, c, type: 'ghost' });
        sfx('illusion');
    } else if (key === 'scream') {
        if (target.ghost) {
            vanishGhost(r, c, 'это была иллюзия', true);
            text = `${A.icon} ${A.name} по ${sqName(r, c)}: цель оказалась иллюзией и рассеялась`;
        } else {
            target.scared = true;
            if (target.t === 'p') target.scaredT = CONFIG.scaredPawnTurns;
            text = `${A.icon} ${A.name}: ${pieceSym(target)} ${sqName(r, c)} напугана (дальность хода 1${target.t === 'p' ? ', ' + CONFIG.scaredPawnTurns + ' хода' : ''})`;
            G.fx.push({ r, c, type: 'hypno' });
            sfx('hypno');
        }
    } else if (key === 'fukashi') {
        target.invis = true;
        text = `${A.icon} ${A.name}: ${pieceSym(target)} на ${sqName(r, c)} стала невидимой`;
        G.fx.push({ r, c, type: 'ghost' });
        sfx('illusion');
    } else if (key === 'freeze' || key === 'hypnosis') {
        if (target.ghost) {
            vanishGhost(r, c, 'это была иллюзия', true);
            text = `${A.icon} ${A.name} по ${sqName(r, c)}: цель оказалась иллюзией и рассеялась`;
        } else if (key === 'freeze') {
            target.frozen = CONFIG.freezeTurns + (target.c === col ? 1 : 0);
            text = `${A.icon} ${A.name}: ${pieceSym(target)} ${sqName(r, c)} заморожен на ${CONFIG.freezeTurns} ${plural(CONFIG.freezeTurns)}`;
            G.fx.push({ r, c, type: 'freeze' });
            sfx('freeze');
        } else {
            target.orig = target.c; target.c = col;
            target.hypno = CONFIG.hypnoTurns; target.fresh = true;
            text = `${A.icon} ${A.name}: ${pieceSym(target)} ${sqName(r, c)} подчиняется на ${CONFIG.hypnoTurns} ${plural(CONFIG.hypnoTurns)}`;
            G.fx.push({ r, c, type: 'hypno' });
            sfx('hypno');
        }
    }
    finishAbility(key, text);
}

function doIllusion(from, A, B) {
    const b = G.board, p = b[from[0]][from[1]];
    const id = G.nextPair++;
    const note = p.t === 'p' ? '' : pieceSym(p);
    const fromS = sqName(from[0], from[1]);
    const ghost = { ...p, x: [...(p.x || [])], ghost: true, pair: id, moved: true };
    delete ghost.soul; delete ghost.scared;
    p.pair = id;
    const res = applyMove(b, A, 'q');
    res.dead.forEach(d => { if (!d.ghost) toGrave(d); });
    b[B.tr][B.tc] = ghost;
    G.ep = A.double ? { r: (A.fr + A.tr) / 2, c: A.fc, pr: A.tr, pc: A.tc } : null;
    // В журнале оба хода (фигуры и копии) в одной строке, порядок случайный
    const dest = [`${note}${fromS}–${sqName(A.tr, A.tc)}`, `${note}${fromS}–${sqName(B.tr, B.tc)}`];
    if (rnd() < 0.5) dest.reverse();
    G.fx.push({ r: A.tr, c: A.tc, type: 'ghost' }, { r: B.tr, c: B.tc, type: 'ghost' });
    sfx('illusion');
    G.last = null;
    // Оригинал срубил фигуру или дал шах прямо при создании: иллюзия тут же рассеивается
    let fade = '';
    if (!res.thorn && !res.burned && b[A.tr][A.tc] === p) {
        const capNow = res.dead.some(d => d !== p && d.c !== p.c);
        if (capNow) fade = 'оригинал срубил фигуру';
        else if (kingAttacked(b, other(p.c))) fade = 'оригинал дал шах';
    }
    if (fade) vanishGhost(B.tr, B.tc, fade, true);
    finishAbility('illusion', `🎭 Иллюзия: ${dest[0]} и ${dest[1]}` + (fade ? ` (иллюзия сразу рассеялась: ${fade})` : ''));
}

function doFrank(from, to) {
    const b = G.board;
    const a = b[from[0]][from[1]], v = b[to[0]][to[1]];
    const aS = pieceSym(a), vS = pieceSym(v);
    eatApply(b, from[0], from[1], to[0], to[1]);
    if (v.soul) {                              // связь душ переходит к поглотившей фигуре
        G.soulList = G.soulList.filter(e => e.p !== v);
        if (!a.soul) { a.soul = true; G.soulList.push({ p: a, pos: [to[0], to[1]] }); }
    }
    G.fx.push({ r: to[0], c: to[1], type: 'zap' });
    sfx('zap');
    G.last = { fr: from[0], fc: from[1], tr: to[0], tc: to[1] };
    finishAbility('frankenstein',
        `🧪 Франкенштейн: ${aS} поглощает ${vS} на ${sqName(to[0], to[1])} и становится ${pieceSym(b[to[0]][to[1]])}`);
}

function doRescue(from, to) {
    const b = G.board, p = b[from[0]][from[1]];
    const sym = pieceSym(p);
    b[from[0]][from[1]] = null;
    p.moved = true;
    b[to[0]][to[1]] = p;
    G.fx.push({ r: to[0], c: to[1], type: 'revive' });
    sfx('revive');
    G.last = { fr: from[0], fc: from[1], tr: to[0], tc: to[1] };
    finishAbility('rescue', `🪂 Спасение: ${sym} ${sqName(from[0], from[1])} → ${sqName(to[0], to[1])}`);
}

function doConfusion(from, m1, m2) {
    const b = G.board, p = b[from[0]][from[1]];
    const note = p.t === 'p' ? '' : pieceSym(p);
    applyMove(b, m1, 'q');
    applyMove(b, m2, 'q');
    G.fx.push({ r: m2.tr, c: m2.tc, type: 'hypno' });
    sfx('hypno');
    G.last = { fr: from[0], fc: from[1], tr: m2.tr, tc: m2.tc };
    finishAbility('confusion',
        `💫 Замешательство: ${note}${sqName(from[0], from[1])} → ${sqName(m1.tr, m1.tc)} → ${sqName(m2.tr, m2.tc)}`);
}

function doConveyor(at, dir) {
    const A = ABILITIES.conveyor, col = G.turn;
    G.conv.push({ r: at[0], c: at[1], dir, owner: col });
    G.fx.push({ r: at[0], c: at[1], type: 'cast' });
    sfx('cast');
    const name = { '-1,0': 'вверх', '1,0': 'вниз', '0,-1': 'влево', '0,1': 'вправо' }[dir.join(',')];
    finishAbility('conveyor', `${A.icon} ${A.name} на ${sqName(at[0], at[1])}: толкает ${name}`);
}

function doPortals(a, b2) {
    const A = ABILITIES.portals, col = G.turn, id = G.nextPortal++;
    G.portals = portalsWith(col, a, b2, id);
    G.fx.push({ r: a[0], c: a[1], type: 'ghost' }, { r: b2[0], c: b2[1], type: 'ghost' });
    sfx('illusion');
    finishAbility('portals', `${A.icon} ${A.name}: ${sqName(a[0], a[1])} ⇄ ${sqName(b2[0], b2[1])}`);
}

function doRelocate(from, to) {
    const A = ABILITIES.relocate;
    moveProps(from, to);
    G.fx.push({ r: to[0], c: to[1], type: 'cast' });
    sfx('cast');
    finishAbility('relocate', `${A.icon} ${A.name}: плитка ${sqName(from[0], from[1])} → ${sqName(to[0], to[1])}`);
}

// Соулмейты: две фигуры получают связь душ
function doSoul(a, b2) {
    const A = ABILITIES.soulmates, pa = G.board[a[0]][a[1]], pb = G.board[b2[0]][b2[1]];
    [[pa, a], [pb, b2]].forEach(([p, pos]) => { p.soul = true; G.soulList.push({ p, pos }); });
    G.fx.push({ r: a[0], c: a[1], type: 'cast' }, { r: b2[0], c: b2[1], type: 'cast' });
    sfx('hypno');
    finishAbility('soulmates', `${A.icon} ${A.name}: связь душ между ${pieceSym(pa)} ${sqName(a[0], a[1])} и ${pieceSym(pb)} ${sqName(b2[0], b2[1])}`);
}

// Гибель фигуры со связью душ убивает все такие фигуры в радиусе 3×3, цепочкой
function soulSync() {
    if (!G.soulList.length) return;
    for (let guard = 0; guard < 30; guard++) {
        const onBoard = new Map();
        G.board.forEach((row, r) => row.forEach((p, c) => { if (p && p.soul && !p.ghost) onBoard.set(p, [r, c]); }));
        G.soulList.forEach(e => { if (onBoard.has(e.p)) e.pos = onBoard.get(e.p); });
        const dead = G.soulList.filter(e => !onBoard.has(e.p));
        if (!dead.length) return;
        G.soulList = G.soulList.filter(e => onBoard.has(e.p));
        let killed = false;
        dead.forEach(e => {
            G.soulList.forEach(o => {
                const pos = onBoard.get(o.p);
                if (!pos || Math.abs(pos[0] - e.pos[0]) > 1 || Math.abs(pos[1] - e.pos[1]) > 1) return;
                if (magicProof(G.board, pos[0], pos[1])) return;
                G.board[pos[0]][pos[1]] = null;
                toGrave(o.p);
                onBoard.delete(o.p);
                killed = true;
                G.soulList.push({ p: o.p, pos });         // следующий проход обработает и его гибель (цепочка)
                G.fx.push({ r: pos[0], c: pos[1], type: 'boom' });
                addLog('n', `🔗 Связь душ: ${pieceSym(o.p)} на ${sqName(pos[0], pos[1])} гибнет вслед за ${sqName(e.pos[0], e.pos[1])}`);
            });
        });
        if (!killed) return;
        sfx('capture');
    }
}

// Фен-Янь: клетки цвета parity (0 светлые, 1 тёмные) становятся острыми
function doFenyan(parity) {
    const A = ABILITIES.fenyan, skip = [];
    G.board.forEach((row, r) => row.forEach((p, c) => { if (p) skip.push(r + ',' + c); }));      // клетки с фигурами острыми не становятся
    G.sharp.push({ parity, owner: G.turn, left: 2, skip });
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === parity && !skip.includes(r + ',' + c)) G.fx.push({ r, c, type: 'cast' });
    sfx('cast');
    G.last = null;
    finishAbility('fenyan', `${A.icon} ${A.name}: ${parity === 0 ? 'светлые' : 'тёмные'} клетки острые (ваш ход и ход врага). Теперь сделайте ход`);
}

// Пассивка Самурая: король телепортируется на безопасное свободное поле, тратя ход
function doTeleport(r, c) {
    const col = G.turn, k = findKing(G.board, col);
    const kp = G.board[k[0]][k[1]];
    const from = sqName(k[0], k[1]);
    G.board[k[0]][k[1]] = null;
    kp.moved = true;
    G.board[r][c] = kp;
    G.fx.push({ r: k[0], c: k[1], type: 'poof' }, { r, c, type: 'ghost' });
    sfx('illusion');
    G.last = { fr: k[0], fc: k[1], tr: r, tc: c };
    G.cd[col].teleport = cdOf(col, 'teleport');
    G.ep = null;
    G.mode = null;
    addLog(col, `🌀 Кагэватари: король ${from} → ${sqName(r, c)}`);
    endTurn();
}

// Пассивка Охотника: метка стрелы возле короля, ход не тратится
function placeAim(r, c) {
    const col = G.turn;
    G.fire.push({ r, c, owner: col, kind: 'arrow' });
    G.cd[col].aim = cdOf(col, 'aim');
    G.fx.push({ r, c, type: 'cast' });
    sfx('arrow');
    addLog(col, `🎯 Меткий глаз: стрела нацелена на ${sqName(r, c)} (ход не потрачен)`);
    G.mode = null; G.sel = null; G.moves = [];
    render();
}

// Способности без цели: ZA WARUDO и Мисклик!
function instantAbility(k, via) {
    const col = G.turn, cdKey = via || k;
    G.mode = null; G.sel = null; G.moves = [];
    if (k === 'zawarudo') {
        G.cd[col][cdKey] = cdOf(col, cdKey);
        G.lastAb[col] = k;
        G.bonus = { kind: 'zw', step: 1 };
        sfx('rewind');
        addLog(col, `${ABILITIES.zawarudo.icon} ZA WARUDO! Время остановлено: два хода подряд, первым нельзя ни шаховать, ни рубить`);
        continueTurn();
    } else if (k === 'misclick') {
        const n = HIST.length, snap = HIST[n - 3];
        REW.undo = true;      // для перемотки: убрать только два отменённых хода
        // перезарядка Мисклика (и зеркала) не зависит от перемотки времени, иначе два Повелителя могли бы отматывать друг друга бесконечно
        const keepCd = { w: { misclick: G.cd.w.misclick, copy: G.cd.w.copy }, b: { misclick: G.cd.b.misclick, copy: G.cd.b.copy } };
        G = structuredClone(snap.state);
        HIST = HIST.slice(0, n - 2);
        ['w', 'b'].forEach(sd => { if (keepCd[sd].misclick !== undefined) G.cd[sd].misclick = keepCd[sd].misclick; if (keepCd[sd].copy !== undefined) G.cd[sd].copy = keepCd[sd].copy; });
        G.cd[col][cdKey] = cdOf(col, cdKey);
        G.lastAb[col] = 'misclick';
        sfx('rewind');
        addLog(col, `${ABILITIES.misclick.icon} Мисклик! Время отмотано: отменены ход противника и ваш предыдущий ход`);
        computeState(col);
        render();
    }
}

// Пассивка Повелителя времени: замедляет способности врага
// Ход сурка: на пустой клетке скрыто и бесплатно, на фигуре видно и тратит ход
function doGroundhog(r, c) {
    const col = G.turn, via = G.mode && G.mode.via, cdKey = via || 'groundhog';
    const target = G.board[r][c];
    if (hiddenFor(target, col)) revealPiece(r, c, 'на неё применили Ход сурка');      // это уже «фигура под ловушкой»: ход тратится
    G.hogs.push({ r, c, owner: col, exempt: target ? uidOf(target) : null, visible: !!target });
    if (target) {
        G.fx.push({ r, c, type: 'cast' });
        sfx('rewind');
        finishAbility('groundhog', `${ABILITIES.groundhog.icon} ${ABILITIES.groundhog.name}: временная ловушка на ${sqName(r, c)}`);
        return;
    }
    G.cd[col][cdKey] = cdOf(col, cdKey);
    G.lastAb[col] = 'groundhog';
    addLog(col, `${ABILITIES.groundhog.icon} ${ABILITIES.groundhog.name}: временная ловушка установлена (место скрыто)`);
    G.mode = null; G.sel = null; G.moves = [];
    sfx('rewind');
    render();
}

function doTimeSlow(k) {
    const col = G.turn, en = other(col), parts = [];
    HEROES[G.hero[en]].abilities.forEach(a => {
        if (a === k) {
            G.cd[en][a] += 2;
            G.cdBonus[en][a] = (G.cdBonus[en][a] || 0) + 1;
            parts.push(`${ABILITIES[a].name} +2 (и +1 навсегда)`);
        }
        else if (G.cd[en][a] > 0) { G.cd[en][a] += 1; parts.push(`${ABILITIES[a].name} +1`); }
    });
    G.cd[col].timeslow = cdOf(col, 'timeslow');
    sfx('rewind');
    addLog(col, `${PASSIVES.timeslow.icon} Замедление времени: перезарядка врага ${parts.join(', ')}`);
    G.mode = null; G.sel = null; G.moves = [];
    if (CONFIG.timePassiveCostsTurn) { G.ep = null; endTurn(); } else render();
}

// Можно ли сейчас применить пассивку с кнопкой (Меткий глаз / Кагэватари)
function canPassive(col, k) {
    if (G.cd[col][k] > 0 || G.bonus || G.pairStep || G.archUsed) return false;
    if (G.disabled && G.disabled[col] && G.disabled[col][k] > 0) return false;
    if (k === 'teleport' && blockedByForce(col, k)) return false;
    if (k === 'teleport' && !G.board.some(row => row.some(p => p && p.c === col && p.t !== 'k' && !p.ghost))) return false;      // у самурая нет других фигур
    return abilityCells(k, col).length > 0;
}

/* =====================================================================
   ВВОД
   ===================================================================== */
function startMode(k, via) {
    G.sel = null; G.moves = [];
    const base = via ? { type: k, via } : { type: k };
    if (k === 'resurrect' || k === 'raise') G.mode = { ...base, piece: null, cells: [] };
    else if (k === 'timeslow' || k === 'tomato') G.mode = { ...base, cells: [] };
    else if (STAGED.includes(k)) G.mode = { ...base, stage: 'piece', cells: abilityCells(k, G.turn) };
    else G.mode = { ...base, cells: abilityCells(k, G.turn) };
}

// Способности, зависящие от свободной клетки: попытка применить их на клетку с невидимой вражеской фигурой раскрывает её, ход не тратится
const FREE_CELL_KEYS = ['ritual', 'vine', 'virus', 'trap', 'lure', 'generator', 'conveyor', 'portals', 'relocate'];

function onModeCell(r, c) {
    const m = G.mode, t = m.type;
    if (FREE_CELL_KEYS.includes(t) && hiddenFor(G.board[r][c], G.turn)) {
        revealPiece(r, c, 'на её клетку попытались поставить плитку или ловушку');
        cancelAbilityMode();
        return;
    }
    if (t === 'pretense') {                  // Притворство: тайный выбор предателя
        const tg = G.board[r][c];
        tg.betray = G.turn;
        G.pretense[G.turn] = 'done';
        addLog('n', '🃏 Шут: Притворство применено втайне');
        G.mode = null; G.sel = null; G.moves = [];
        render();
        return;
    }
    if (t === 'banana') {                    // Банановая кожура: сначала клетка, потом направление
        const me = G.turn;
        if (m.stage === 'piece') {
            if (hiddenFor(G.board[r][c], me)) { revealPiece(r, c, 'на её клетку попытались положить банановую кожуру'); cancelAbilityMode(); return; }
            m.first = [r, c]; m.stage = 'dir';
            m.cells = [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dr, dc]) => [r + dr, c + dc]).filter(([rr, cc]) => inb(rr, cc));
            render();
            return;
        }
        placeBanana(m.first, [r, c]);
        return;
    }
    if (t === 'jaws') {
        const me = G.turn;
        if (guardPlacement(me, r, c, nb => { nb[r][c] = { ...mk('j', me), moved: true }; })) { cancelAbilityMode(); return; }
        useAbility('jaws', r, c);
        return;
    }
    if (t === 'resurrect' || t === 'raise') {
        const d = G.grave[m.piece.col][m.piece.idx], me = G.turn;
        if (guardPlacement(me, r, c, nb => { nb[r][c] = { ...mk(d.t, me), x: [...(d.x || [])], moved: true, zombie: t === 'raise' }; })) { cancelAbilityMode(); return; }
        useAbility(t, r, c, m.piece);
        return;
    }

    if (t === 'illusion') {
        if (m.stage === 'piece') {
            m.from = [r, c];
            m.opts = illusionOptions(r, c);
            m.stage = 'A';
            m.cells = m.opts.map(o => [o.A.tr, o.A.tc]);
            G.sel = { r, c };
        } else if (m.stage === 'A') {
            m.choice = m.opts.find(o => o.A.tr === r && o.A.tc === c);
            m.stage = 'B';
            m.cells = m.choice.Bs.map(x => [x.tr, x.tc]);
        } else {
            const B = m.choice.Bs.find(x => x.tr === r && x.tc === c);
            doIllusion(m.from, m.choice.A, B);
            return;
        }
        render();
        return;
    }

    if (t === 'frankenstein') {
        if (m.stage === 'piece') {
            m.from = [r, c];
            m.stage = 'target';
            m.cells = frankTargets(r, c);
            G.sel = { r, c };
            render();
        } else {
            doFrank(m.from, [r, c]);
        }
        return;
    }

    if (t === 'rescue') {
        if (m.stage === 'piece') {
            m.from = [r, c];
            m.stage = 'dest';
            m.cells = rescueDests(r, c);
            G.sel = { r, c };
            render();
        } else {
            const me = G.turn, f = m.from;
            if (guardPlacement(me, r, c, nb => { nb[r][c] = nb[f[0]][f[1]]; nb[f[0]][f[1]] = null; })) { cancelAbilityMode(); return; }
            doRescue(m.from, [r, c]);
        }
        return;
    }

    if (t === 'confusion') {
        if (m.stage === 'piece') {
            const p = G.board[r][c];
            if (p.ghost) {
                vanishGhost(r, c, 'это была иллюзия', true);
                finishAbility('confusion', `${ABILITIES.confusion.icon} ${ABILITIES.confusion.name} по ${sqName(r, c)}: цель оказалась иллюзией и рассеялась`);
                return;
            }
            m.from = [r, c];
            m.opts = confusionOptions(r, c);
            m.stage = 'A';
            m.cells = m.opts.map(o => [o.m1.tr, o.m1.tc]);
            G.sel = { r, c };
        } else if (m.stage === 'A') {
            m.choice = m.opts.find(o => o.m1.tr === r && o.m1.tc === c);
            m.stage = 'B';
            m.cells = m.choice.seconds.map(x => [x.tr, x.tc]);
        } else {
            const m2 = m.choice.seconds.find(x => x.tr === r && x.tc === c);
            doConfusion(m.from, m.choice.m1, m2);
            return;
        }
        render();
        return;
    }

    if (t === 'apocalypse') {
        if (m.stage === 'piece') {
            m.from = [r, c];
            m.moves = zombieMoves(r, c, G.turn);
            m.stage = 'dest';
            m.cells = m.moves.map(x => [x.tr, x.tc]);
            G.sel = { r, c };
            render();
        } else {
            const mv = m.moves.find(x => x.tr === r && x.tc === c);
            const ctx = { apo: true, cdKey: m.via || 'apocalypse' };
            const zp = G.board[m.from[0]][m.from[1]];
            if (zp.c !== G.turn) { ctx.restoreC = zp.c; zp.c = G.turn; }   // чужой зомби ходит за вас
            tryMove(mv, ctx);
        }
        return;
    }

    if (t === 'conveyor') {
        if (m.stage === 'piece') {
            m.at = [r, c];
            m.stage = 'dir';
            m.dirs = conveyorDirs(r, c, G.turn);
            m.cells = m.dirs.map(([dr, dc]) => [r + dr, c + dc]);
            G.sel = { r, c };
            render();
        } else {
            doConveyor(m.at, m.dirs.find(([dr, dc]) => m.at[0] + dr === r && m.at[1] + dc === c));
        }
        return;
    }

    if (t === 'portals') {
        if (m.stage === 'piece') {
            m.a = [r, c];
            m.stage = 'second';
            m.cells = portalPartners(m.a, G.turn);
            G.sel = { r, c };
            render();
        } else {
            doPortals(m.a, [r, c]);
        }
        return;
    }

    if (t === 'lie') {
        if (m.stage === 'piece') {
            m.from = [r, c];
            m.opts = lieOptions(r, c);
            m.stage = 'real';
            m.cells = m.opts.map(o => [o.R.tr, o.R.tc]);
            G.sel = { r, c };
        } else if (m.stage === 'real') {
            m.choice = m.opts.find(o => o.R.tr === r && o.R.tc === c);
            m.stage = 'fake';
            m.cells = m.choice.Fs.map(x => [x.tr, x.tc]);
        } else {
            doLie(m.from, m.choice.R, m.choice.Fs.find(x => x.tr === r && x.tc === c));
            return;
        }
        render();
        return;
    }

    if (t === 'generator') {
        if (m.stage === 'piece') {
            m.a = [r, c];
            m.stage = 'second';
            m.cells = abilityCells('generator', G.turn).filter(([rr, cc]) => !(rr === r && cc === c));
            G.sel = { r, c };
            render();
        } else {
            const A = ABILITIES.generator;
            G.gens.push({ r: m.a[0], c: m.a[1], sign: '+', owner: G.turn }, { r, c, sign: '-', owner: G.turn });
            G.fx.push({ r: m.a[0], c: m.a[1], type: 'cast' }, { r, c, type: 'cast' });
            sfx('zap');
            finishAbility('generator', `${A.icon} ${A.name}: плюс ${sqName(m.a[0], m.a[1])}, минус ${sqName(r, c)}`);
        }
        return;
    }

    if (t === 'groundhog') { doGroundhog(r, c); return; }

    if (t === 'relocate') {
        if (m.stage === 'piece') {
            m.from = [r, c];
            m.stage = 'dest';
            m.cells = relocateDests(r, c, G.turn);
            G.sel = { r, c };
            render();
        } else {
            doRelocate(m.from, [r, c]);
        }
        return;
    }

    if (t === 'soulmates') {
        if (m.stage === 'piece') {
            m.first = [r, c];
            m.stage = 'second';
            m.cells = abilityCells('soulmates', G.turn).filter(([rr, cc]) => !(rr === r && cc === c));
            G.sel = { r, c };
            render();
        } else {
            doSoul(m.first, [r, c]);
        }
        return;
    }

    if (t === 'kghost') {
        makeKingGhost(m.from[0], m.from[1], r, c, m.text, `${m.note}${m.fromSq}–${sqName(r, c)}`);
        G.mode = null;
        endTurn();
        return;
    }

    if (t === 'aim') { placeAim(r, c); return; }
    if (t === 'teleport') {
        const me = G.turn, k = findKing(G.board, me);
        if (guardPlacement(me, r, c, nb => { nb[r][c] = nb[k[0]][k[1]]; nb[k[0]][k[1]] = null; }, true)) { cancelAbilityMode(); return; }
        doTeleport(r, c);
        return;
    }
    if (t === 'fenyan') { doFenyan((r + c) % 2); return; }

    useAbility(t, r, c);
}

function onCell(r, c) {
    const col = G.turn;
    if (G.pairStep) {                       // иллюзия: нужно сходить второй фигурой пары
        const ps = G.pairStep;
        if (G.sel) {
            const mv = G.moves.find(m => m.tr === r && m.tc === c);
            if (mv) { tryMove(mv, { pairSecond: true, tail: ps.tail }); return; }
        }
        if (r === ps.r && c === ps.c) { G.sel = { r, c }; G.moves = selectableMoves(r, c); render(); }
        return;
    }
    if (G.mode) {
        const m = G.mode;
        if (m.cells && m.cells.some(x => x[0] === r && x[1] === c)) { onModeCell(r, c); return; }
        if (m.locked) return;        // обязательный выбор, отменить нельзя
        G.mode = null;               // клик мимо отменяет способность и работает как обычный клик
        G.sel = null; G.moves = [];
    }
    if (G.sel) {
        const cands = G.moves.filter(m => m.tr === r && m.tc === c);
        let mv = cands[0];
        if (cands.length > 1 && cands.some(m => m.castle) && cands.some(m => m.possess)) {   // Призрак: рокировка и вселение на одну клетку
            const pick = pickOverride || (uiConfirm('Рокировка (ОК) или обычный ход короля без ладьи (Отмена)?') ? 'castle' : 'possess');
            lastPick = pick;
            mv = cands.find(m => pick === 'castle' ? m.castle : m.possess);
        }
        if (mv) { if (mv.decoy && !mv.redirect) bumpInvis(mv); else tryMove(mv); return; }
        // Пассивка: второй клик по выбранному королю включает прицел
        if (G.sel.r === r && G.sel.c === c) {
            const k = G.board[r][c];
            const ps = HEROES[G.hero[col]].passive;
            if (k && k.t === 'k' && !k.ghost && ACTIVE_PASSIVES.includes(ps) && canPassive(col, ps)) {
                startMode(ps);
                render();
                return;
            }
        }
    }
    const p = G.board[r][c];
    if (p && p.betray === col && p.c !== col && !p.ghost && !p.invis && betrayReady(col)) {      // Предательство: двойной клик переводит фигуру на сторону Шута (тратит ход)
        if (G.sel && G.sel.r === r && G.sel.c === c) { doBetray(r, c); return; }
        if (canBetray(col, r, c)) { G.sel = { r, c }; G.moves = []; } else { G.sel = null; G.moves = []; }
        render();
        return;
    }
    if (p && p.c === col) {
        G.sel = { r, c }; G.moves = selectableMoves(r, c);
    } else { G.sel = null; G.moves = []; }
    render();
}

function onAbility(k) {
    if (G.over || G.bonus || G.pairStep || (G.mode && G.mode.locked)) return;
    const cur = G.mode ? (G.mode.via ? 'copy' : G.mode.type) : null;
    if (cur === k) { G.mode = null; G.sel = null; G.moves = []; render(); return; }
    if (k === 'copy') {
        const eff = G.lastAb[other(G.turn)];
        if (!eff) return;
        if (NO_TARGET.includes(eff)) { instantAbility(eff, 'copy'); return; }
        startMode(eff, 'copy');
    } else if (NO_TARGET.includes(k)) { instantAbility(k); return; }
    else startMode(k);
    render();
}

function onGrave(i, gcol) {
    const m = G.mode;
    if (!m || (m.type !== 'resurrect' && m.type !== 'raise')) return;
    if (m.type === 'resurrect' && gcol !== G.turn) return;
    m.piece = { col: gcol, idx: i };
    m.cells = abilityCells(m.type, G.turn, G.grave[gcol][i]);
    render();
}

// Любое действие игрока: выполняется у себя и (онлайн) отправляется сопернику
function netDo(msg) {
    if (NET.on && (NET.lost || !isActor())) return;
    lastPick = null;
    applyInput(msg);
    if (NET.on) netSend({ t: 'in', m: { ...msg, pick: lastPick } });
}

function applyInput(m) {
    if (!G || G.over) return;
    switch (m.t) {
        case 'cell': pickOverride = m.pick || null; onCell(m.r, m.c); pickOverride = null; break;
        case 'ab': onAbility(m.k); break;
        case 'slow': doTimeSlow(m.k); break;
        case 'tomato': doTomato(m.k); break;
        case 'grave': onGrave(m.i, m.col); break;
        case 'promo': applyPromo(m.p); break;
        case 'end': if (G.archUsed && !G.check && !G.pendingPromo) endTurn(); break;
        case 'esc': cancelAll(); break;
    }
}

function applyPromo(t) {
    if (!G.pendingPromo) return;
    const pp = G.pendingPromo;
    G.pendingPromo = null;
    $('#promo').classList.add('hidden');
    executeMove(pp.mv, t, pp.ctx);
}

function resignSide(side) {
    if (!G || G.over) return;
    G.over = { winner: other(side), title: 'Сдача', text: `${colorName(other(side))} побеждают.` };
    render(); showGameOver();
}

function drawGame() {
    if (!G || G.over) return;
    G.over = { winner: null, title: 'Ничья', text: 'Ничья по согласию.' };
    render(); showGameOver();
}

function cancelAll() {
    if (!G || G.over || G.pendingPromo) return;
    if (G.mode && G.mode.locked) return;
    if (G.pairStep) { G.sel = null; G.moves = []; render(); return; }
    G.mode = null; G.sel = null; G.moves = [];
    render();
}

/* Превращение пешки */
function showPromo(mv, ctx) {
    G.pendingPromo = { mv, ctx: ctx || {} };
    $('#promoBtns').innerHTML = ['q', 'r', 'b', 'n']
        .map(t => `<button class="promo-btn ${G.turn}" data-promo="${t}">${pImg(G.turn, t)}</button>`).join('');
    if (isActor()) $('#promo').classList.remove('hidden');
}

/* Конец партии */
function showGameOver() {
    setTimeout(() => {
        if (!G || !G.over) return;
        $('#goTitle').textContent = G.over.title;
        $('#goText').textContent = G.over.text;
        $('#gameover').classList.remove('hidden');
    }, 900);
}

/* =====================================================================
   ОТРИСОВКА
   ===================================================================== */
const THORNS = '<div class="thorns">' +
    Array.from({ length: 8 }, (_, i) => `<i style="--a:${i * 45}deg"></i>`).join('') + '</div>';

function render() {
    updateEndBtn();
    renderPanels();
    renderBoard();
    renderStatus();
    renderLog();
}

function updateEndBtn() {
    const b = $('#btnEnd');
    if (!b) return;
    const arch = G.hero.w === 'architect' || G.hero.b === 'architect';
    b.classList.toggle('hidden', !arch);
    b.disabled = !(!G.over && G.hero[G.turn] === 'architect' && G.archUsed && !G.check && !G.pendingPromo && !G.pairStep && !(G.mode && G.mode.locked));
}

function renderBoard() {
    const el = $('#board');
    el.dataset.turn = G.over ? '' : G.turn;
    const km = G.mode && G.mode.type === 'kghost' ? G.mode : null;   // король-иллюзия: пока не выбрана клетка, король стоит на старом месте
    const targets = new Map();
    const actor = isActor();                       // подсказки выбора видит только тот, кто ходит
    const flip = NET.on && NET.me === 'b';         // чёрные видят доску со своей стороны
    $('#app').classList.toggle('flipped', flip);
    if (G.sel && actor) G.moves.filter(m => !m.hidden).forEach(m => targets.set(m.tr + ',' + m.tc, ((G.board[m.tr][m.tc] && !G.board[m.tr][m.tc].invis && !supOpen(G.board, G.board[m.tr][m.tc])) || m.ep) ? 't-cap' : 't-move'));
    if (G.mode && G.mode.cells && actor) (G.mode.cells.show || G.mode.cells).forEach(([r, c]) => targets.set(r + ',' + c, 't-' + G.mode.type));      // show: клетки, которые подсвечиваем (остальные нажимаются, но выглядят опасными)
    const kingPos = G.check ? findKing(G.board, G.turn) : null;
    const must = new Set(G.over || G.mode || !actor ? [] : G.forced.map(m => m.fr + ',' + m.fc));

    let html = '';
    for (let ri = 0; ri < 8; ri++) {
        for (let ci = 0; ci < 8; ci++) {
            const r = flip ? 7 - ri : ri, c = flip ? 7 - ci : ci;
            let p = G.board[r][c];
            if (km && km.to[0] === r && km.to[1] === c) p = null;
            if (km && km.orig[0] === r && km.orig[1] === c) p = km.kp;
            const dc = (!p && G.decoys.find(x => x.r === r && x.c === c)) || null;
            let cls = 'cell ' + ((r + c) % 2 ? 'dark' : 'light');
            if (G.sel && actor && G.sel.r === r && G.sel.c === c) cls += ' sel';
            if (G.last && ((G.last.fr === r && G.last.fc === c) || (G.last.tr === r && G.last.tc === c))) cls += ' last';
            const tm = targets.get(r + ',' + c);
            if (tm) cls += ' ' + tm;
            if (kingPos && kingPos[0] === r && kingPos[1] === c) cls += ' incheck';

            html += `<div class="${cls}" data-r="${r}" data-c="${c}">`;
            if (ci === 0) html += `<span class="coord rank">${8 - r}</span>`;
            if (ri === 7) html += `<span class="coord file">${'abcdefgh'[c]}</span>`;

            if (sharpAt(r, c)) html += '<div class="sharp-mark"></div>';
            const bt = burnAt(r, c);
            if (bt) html += `<div class="burn-mark"><span>🔥</span><i>${bt.life}</i></div>`;
            G.fire.filter(x => x.kind === 'shomen' && x.c === c).forEach(f => { html += `<div class="shomen-mark ${f.owner}"></div>`; });
            G.fire.filter(x => x.r === r && x.c === c).forEach(f => {
                html += f.kind === 'arrow'
                    ? `<div class="arrow-mark ${f.owner}">🏹</div>`
                    : `<div class="fire-mark ${f.owner}">🔥</div>`;
            });
            const cvm = G.conv.find(x => x.r === r && x.c === c);
            if (cvm) html += `<div class="conv-mark">${{ '-1,0': '⬆', '1,0': '⬇', '0,-1': '⬅', '0,1': '➡' }[cvm.dir.map(x => (flip ? -x : x)).join(',')]}</div>`;
            const ptm = G.portals.find(x => x.r === r && x.c === c);
            if (ptm) html += `<div class="portal-mark pm${(G.hero[ptm.owner] === 'architect' ? 0 : 2) + ptm.id % 2}"><span>⇄</span></div>`;
            if (G.lureCells.some(x => x.r === r && x.c === c)) html += '<div class="lure-mark">🎣</div>';
            if (showTraps && G.traps.some(x => x.r === r && x.c === c && (!NET.on || x.owner === NET.me))) html += '<div class="trap-mark">🪤</div>';
            {
                const bn = G.bananas && G.bananas.find(x => x.r === r && x.c === c);
                if (bn && jesterSees(bn.owner)) html += `<div class="tile-mark banana-mark">🍌<i>${{ '-1,0': '⬆', '1,0': '⬇', '0,-1': '⬅', '0,1': '➡' }[bn.dir.map(x => (flip ? -x : x)).join(',')]}</i></div>`;
            }
            if (G.vines.some(x => x.r === r && x.c === c)) { const vn = G.vines.find(x => x.r === r && x.c === c); html += `<div class="tile-mark vine-mark">🌿<i class="vine-t">${vn.left}</i></div>`; }
            if (G.virus.some(x => x.r === r && x.c === c)) html += '<div class="tile-mark virus-mark">☣️</div>';
            {
                const rt = G.rituals.find(x => x.r === r && x.c === c);
                if (rt) {
                    // онлайн: чужие плитки красные. За одним экраном обычный цвет у того, кто поставил ритуал первым
                    const mine = NET.on ? rt.owner === NET.me : rt.owner === G.rituals[0].owner;
                    html += `<div class="tile-mark ritual-mark${mine ? '' : ' enemy'}">🕯️</div>`;
                }
            }
            const gm = G.gens.find(x => x.r === r && x.c === c);
            if (gm) html += `<div class="tile-mark gen-mark ${gm.sign === '+' ? 'plus' : 'minus'} ${G.hero[gm.owner] === 'architect' ? '' : 'alt'}">${gm.sign === '+' ? '＋' : '－'}</div>`;
            const hg = G.hogs.find(x => x.r === r && x.c === c);
            if (hg && (hg.visible || (showTraps && (NET.on ? hg.owner === NET.me : hg.owner === G.turn)))) html += `<div class="tile-mark hog-mark ${hg.visible ? '' : 'hidden-hog'}">⏳</div>`;

            if (dc) html += `<div class="piece ${dc.col} t-${dc.t}${showGhosts ? ' ghost' : ''}">${GLYPH[dc.t]}${dc.x && dc.x.length ? `<span class="xs">${dc.x.map(t => pImg(dc.col, t)).join('')}</span>` : ''}</div>`;
            if (p && !(p.invis && !(showInvis && (!NET.on || p.c === NET.me)))) {
                let pc = 'piece ' + p.c + ' t-' + p.t;
                if (p.shield) pc += ' shielded';
                if (p.frozen > 0) pc += ' frozen';
                if (p.snared > 0) pc += ' snared';
                if (p.zombie) pc += ' zombie';
                if (p.hypno) pc += ' hypno';
                if (p.lure) pc += ' lured';
                if (p.ghost && showGhosts && (!NET.on || p.c === NET.me)) pc += ' ghost';
                if (p.invis) pc += ' invis';
                if (p.sup) pc += ' sup';
                if (p.phase || isPhase(p) || ritualAt(r, c)) pc += ' phase';
                if (auraProtected(G.board, r, c)) pc += ' aura';
                if (must.has(r + ',' + c)) pc += ' must';
                if (G.fx.some(x => x.r === r && x.c === c && x.type === 'land')) pc += ' pop';
                html += `<div class="${pc}">${GLYPH[p.t]}`;
                if (p.x && p.x.length) html += `<span class="xs">${p.x.map(t => pImg(p.c, t)).join('')}</span>`;
                if (p.shield) html += THORNS + `<span class="shn">${p.shield}</span>`;
                if (p.zombie) html += '<span class="zb">☠</span>';
                if (p.hypno) html += `<span class="hy">👁${p.hypno}</span>`;
                if (p.frozen > 0) html += `<span class="fz">❄${p.frozen}</span>`;
                if (p.snared > 0) html += '<span class="sn">🪤</span>';
                if (p.lure) html += '<span class="lr">🎣</span>';
                if (p.soul) html += '<span class="so">🔗</span>';
                if (p.scared) html += `<span class="sc">😱${p.scaredT || ''}</span>`;
                if (p.sup) html += '<span class="sp">⚛</span>';
                if (p.altruist > 0) html += `<span class="al">👼${p.altruist}</span>`;
                if (p.t === 'j') html += `<span class="jl">⏳${p.life}</span>`;
                if (p.cap > 0 && jesterSees(p.capBy)) html += `<span class="cp">🤡${p.cap}</span>`;
                if (p.betray && jesterSees(p.betray)) html += '<span class="bt">🃏</span>';
                if (p.warded > 0) html += `<span class="wd">✴${p.warded}</span>`;
                if (p.bomb) html += `<span class="bm">💣${p.bomb}</span>`;
                if (p.t === 'p' && brotherImmune(G.board, r, c)) html += '<span class="br">⚜</span>';
                html += '</div>';
            }

            G.fx.filter(x => x.r === r && x.c === c && x.type !== 'land')
                .forEach(x => { html += `<div class="fx fx-${x.type}"></div>`; });
            html += '</div>';
        }
    }
    el.innerHTML = html;

    if (G.fx.some(x => x.type === 'boom')) {
        el.classList.remove('shake');
        void el.offsetWidth;
        el.classList.add('shake');
    }
    G.fx = [];
}

function panelHTML(col) {
    const hero = HEROES[G.hero[col]];
    const ps = PASSIVES[hero.passive];
    const isTurn = G.turn === col && !G.over;
    const active = isTurn && (!NET.on || col === NET.me);      // кнопки доступны только своему игроку
    const lock = !!(G.bonus || G.pairStep || (G.mode && G.mode.locked) || G.pendingPromo);
    let h = `<div class="panel-head"><span class="hero-icon">${hero.icon}</span>
    <div><div class="pname">${colorName(col)}</div><div class="hname">${hero.name}</div></div>
    ${isTurn ? '<span class="turn-dot">ход</span>' : ''}${clockHTML(col)}</div>`;
    h += `<div class="passive" title="${ps.desc}"><span>${ps.icon}</span> Пассивка: <b>${ps.name}</b></div><div class="abilities">`;

    const slowMode = !G.over && G.mode && G.mode.type === 'timeslow' && col !== G.turn && isActor();
    const tomMode = !G.over && G.mode && G.mode.type === 'tomato' && col !== G.turn && isActor();
    hero.abilities.forEach(k => {
        const a = ABILITIES[k], cd = G.cd[col][k];
        if (tomMode) {            // Красная обструкция: нажмите на способность врага
            if (G.disabled && G.disabled[col] && G.disabled[col][k] > 0) {      // уже отключённую выбрать нельзя
                h += `<button class="ab" disabled title="${abilityDesc(k)}">
      <span class="ab-icon">${a.icon}</span><span class="ab-name">${a.name}</span><span class="ab-cd">🍅 уже отключена</span></button>`;
                return;
            }
            h += `<button class="ab slowable" data-tomato="${k}" title="${abilityDesc(k)}">
      <span class="ab-icon">${a.icon}</span><span class="ab-name">${a.name}</span><span class="ab-cd">🍅 сюда</span></button>`;
            return;
        }
        const offT = (G.disabled && G.disabled[col] && G.disabled[col][k]) || 0;
        // «Ход — это ложь» и зеркало, пока в нём лежит эта способность: перезарядка скрыта от соперника, чтобы не выдавать применение
        const secret = k === 'lie' || (k === 'copy' && G.lastAb[other(col)] === 'lie');
        const hideCd = secret && (NET.on ? col !== NET.me : !active);
        if (slowMode) {
            h += `<button class="ab slowable" data-slow="${k}" title="${abilityDesc(k)}">
      <span class="ab-icon">${a.icon}</span><span class="ab-name">${a.name}</span><span class="ab-cd">${secret ? '?' : ''} → +2</span>${(!secret && cd > 0) ? `<span class="cd-badge">⏳${cd}</span>` : ''}</button>`;
            return;
        }
        const on = active && G.mode && (G.mode.via ? 'copy' : G.mode.type) === k;
        const can = active && !lock && abilityAvailable(col, k);
        let sub = 'готово';
        if (cd > 0) sub = '';
        else if (active && G.bonus) sub = 'доп. ход';
        else if (active && G.forced.length && k !== 'apocalypse') sub = G.forcedKind === 'lure' ? 'приманка' : 'зомби рубит';
        else if (active && k === 'shomen' && !G.deaths) sub = 'до первой смерти';
        else if (active && !can) sub = 'нет целей';
        else if (k === 'copy' && can) sub = '→ ' + ABILITIES[G.lastAb[other(col)]].name;
        if (offT) sub = '🍅 отключена';
        if (hideCd) sub = 'скрыто';      // применение не должно быть видно по перезарядке
        h += `<button class="ab ${on ? 'on' : ''}" data-ab="${k}" ${can || on ? '' : 'disabled'} title="${abilityDesc(k)}">
      <span class="ab-icon">${a.icon}</span><span class="ab-name">${a.name}${a.free ? '<i class="free-dot" title="Не тратит ход"></i>' : ''}</span><span class="ab-cd">${sub}</span>${(cd > 0 && !hideCd) ? `<span class="cd-badge">⏳${cd}</span>` : ''}${offT ? `<span class="tm-badge">🍅${offT}</span>` : ''}</button>`;
    });

    // Кнопка пассивки (Меткий глаз / Кагэватари): то же, что второй клик по королю
    if (ACTIVE_PASSIVES.includes(hero.passive)) {
        const pk = hero.passive, cd = G.cd[col][pk];
        const on = active && G.mode && G.mode.type === pk;
        const can = active && !lock && canPassive(col, pk);
        const sub = cd > 0 ? '' : (active && !can ? 'нет целей' : ((pk === 'aim' || (pk === 'timeslow' && !CONFIG.timePassiveCostsTurn)) ? 'бесплатно' : 'готово'));
        h += `<button class="ab passive-btn ${on ? 'on' : ''}" data-ab="${pk}" ${can || on ? '' : 'disabled'} title="${ps.desc}">
      <span class="ab-icon">${ps.icon}</span><span class="ab-name">${ps.name}${(pk === 'aim' || (pk === 'timeslow' && !CONFIG.timePassiveCostsTurn)) ? '<i class="free-dot" title="Не тратит ход"></i>' : ''}</span><span class="ab-cd">${sub}</span>${cd > 0 ? `<span class="cd-badge">⏳${cd}</span>` : ''}</button>`;
    }
    h += '</div>';

    // Сброс: фигуры кликабельны при воскрешении / поднятии зомби
    const m = G.mode;
    const clickable = !G.over && m && isActor() && ((m.type === 'raise') || (m.type === 'resurrect' && col === G.turn));
    const ok = {};
    h += '<div class="grave"><span class="glabel">Сброс:</span>';
    if (!G.grave[col].length) h += '<span class="empty">пусто</span>';
    G.grave[col].forEach((d, i) => {
        let dis = true;
        if (clickable) {
            const key = descKey(d);
            if (!(key in ok)) ok[key] = abilityCells(m.type, G.turn, d).length > 0;
            dis = !ok[key];
        }
        const sel = clickable && m.piece && m.piece.col === col && m.piece.idx === i;
        const extra = d.x && d.x.length ? `<span class="gxs">${d.x.map(t => pImg(col, t)).join('')}</span>` : '';
        h += `<button class="gp ${col} ${sel ? 'sel' : ''}" data-gi="${i}" data-col="${col}" title="${pieceSym(d)}" ${dis ? 'disabled' : ''}>${pImg(col, d.t)}${extra}</button>`;
    });
    h += '</div>';
    return h;
}

function renderPanels() {
    ['w', 'b'].forEach(col => {
        const el = $('#panel-' + col);
        el.className = 'panel h-' + G.hero[col] + (G.turn === col && !G.over ? ' active' : '');
        el.innerHTML = panelHTML(col);
    });
}

function renderStatus() {
    const st = $('#status'), hi = $('#hint');
    if (G.over) { st.textContent = G.over.title; st.className = 'status over'; hi.textContent = G.over.text; return; }
    let s = `Ход: ${colorName(G.turn)}`;
    if (G.bonus) s += G.bonus.kind === 'zw' ? ` · ZA WARUDO, ход ${G.bonus.step}/2` : ' · доп. ход';
    if (G.check === 'check') s += ' · ШАХ!';
    else if (G.check === 'latent') s += ' · шах после взрыва!';
    st.textContent = s;
    st.className = 'status ' + G.turn;

    let h = 'Выберите фигуру или способность героя.';
    const m = G.mode;
    if (G.pairStep) {
        h = '🎭 Оригинал и двойник ходят вместе: теперь сходите второй фигурой пары (кликните на неё).';
    } else if (m) {
        const t = m.type;
        if (t === 'resurrect') h = m.piece ? 'Выберите свободную клетку на своей первой горизонтали (пешка: на любой из первых четырёх).' : 'Выберите фигуру в своём сбросе.';
        else if (t === 'raise') h = m.piece ? 'Выберите клетку на своей первой горизонтали: там встанет зомби.' : 'Выберите фигуру в любом сбросе: своём или чужом.';
        else if (t === 'shield') h = 'Выберите свою фигуру, на которую повесить щит.';
        else if (t === 'rescue') h = m.stage === 'piece' ? 'Выберите свою фигуру на вражеской половине.' : 'Выберите свободную клетку на своей первой горизонтали (пешка: на 2–4 горизонталь).';
        else if (t === 'fireball') h = 'Выберите клетку. Она взорвётся в начале вашего следующего хода и останется гореть.';
        else if (t === 'freeze') h = 'Выберите фигуру для заморозки (можно и свою, кроме короля).';
        else if (t === 'hypnosis') h = 'Выберите вражескую фигуру в радиусе 3×3 от любой вашей.';
        else if (t === 'illusion') h = m.stage === 'piece' ? 'Выберите фигуру, которая сходит и создаст двойника.'
            : m.stage === 'A' ? 'Куда пойдёт фигура?' : 'На какую клетку встанет двойник?';
        else if (t === 'confusion') h = m.stage === 'piece' ? 'Выберите вражескую фигуру (не короля).'
            : m.stage === 'A' ? 'Первый ход этой фигуры (без рубки).' : 'Второй ход этой фигуры (без рубки).';
        else if (t === 'frankenstein') h = m.stage === 'piece' ? 'Выберите свою фигуру, которая поглотит другую.' : 'Выберите свою фигуру, которую она поглотит.';
        else if (t === 'apocalypse') h = m.stage === 'piece' ? 'Выберите своего зомби для дополнительного хода.' : 'Куда пойдёт зомби? Рубить не обязательно.';
        else if (t === 'conveyor') h = m.stage === 'piece' ? 'Выберите свободную клетку для конвейера.' : 'В какую сторону он толкает? Выберите соседнюю клетку в этом направлении.';
        else if (t === 'portals') h = m.stage === 'piece' ? 'Выберите клетку первого портала.' : 'Выберите клетку второго портала.';
        else if (t === 'relocate') h = m.stage === 'piece' ? 'Выберите особую клетку (огонь, метка, конвейер, портал, приманка).' : 'Куда перенести её? Нужна клетка без особых свойств.';
        else if (t === 'trap') h = 'Выберите свободную клетку для невидимого капкана.';
        else if (t === 'arrow') h = 'Выберите клетку в радиусе от короля. Стрела прилетит в начале вашего следующего хода.';
        else if (t === 'lure') h = 'Выберите свободную клетку или свою фигуру для приманки.';
        else if (t === 'aim') h = 'Выберите клетку в пределах 3 шагов от короля. Ход не тратится.';
        else if (t === 'teleport') h = 'Выберите свободное безопасное поле для короля. Это тратит ход.';
        else if (t === 'shomen') h = 'Выберите любую клетку нужной вертикали. В начале вашего следующего хода все фигуры на ней погибнут (кроме королей).';
        else if (t === 'phase') h = 'Выберите свою фигуру (не короля), сквозь которую смогут проходить ваши фигуры.';
        else if (t === 'soulmates') h = m.stage === 'piece' ? 'Выберите первую фигуру для связи душ.' : 'Выберите вторую фигуру.';
        else if (t === 'scream') h = 'Выберите вражескую фигуру, которую нужно напугать.';
        else if (t === 'guardian') h = 'Выберите союзную фигуру (не короля): она станет самоотверженной.';
        else if (t === 'purify') h = 'Выберите любую фигуру: с неё снимутся все эффекты, и она получит защиту от магии.';
        else if (t === 'virus') h = 'Выберите свободную клетку для заражённой плитки.';
        else if (t === 'vine') h = 'Выберите свободную клетку для лозы.';
        else if (t === 'ritual') h = 'Выберите свободную клетку для призрачной плитки.';
        else if (t === 'bumpuku') h = 'Выберите союзную фигуру (не короля), на которую повесить бомбу.';
        else if (t === 'generator') h = m.stage === 'piece' ? 'Выберите свободную клетку для плитки ПЛЮС.' : 'Выберите свободную клетку для плитки МИНУС.';
        else if (t === 'groundhog') h = 'Выберите клетку для временной ловушки. Пустая: скрыто и бесплатно. С фигурой: видно, тратит ход.';
        else if (t === 'lie') h = m.stage === 'piece' ? 'Выберите фигуру, которая сделает ложный ход.' : m.stage === 'real' ? 'Выберите клетку НЕВИДИМОЙ фигуры (настоящий ход).' : 'Выберите клетку ИЛЛЮЗИИ (фейковый ход).';
        else if (t === 'superposition') h = 'Выберите любую фигуру (кроме короля): она получит суперпозицию.';
        else if (t === 'timeslow') h = 'Выберите способность врага в его панели: её перезарядка +2 сейчас и +1 до конца партии, у остальных (если они перезаряжаются) +1.';
        else if (t === 'fukashi') h = 'Выберите свою фигуру, которая станет невидимой.';
        else if (t === 'fenyan') h = 'Выберите любую клетку нужного цвета: все клетки этого цвета станут острыми. Потом сделайте ход.';
        else if (t === 'pretense') h = '🃏 Притворство: выберите вражеского слона или коня. Это тайно, враг ничего не увидит. После 10-го хода врага можно будет потратить ход и дважды нажать на неё: она перейдёт к вам навсегда.';
        else if (t === 'blunder') h = 'Выберите свою фигуру (не короля): на неё наденется шутовской колпак. Враг не узнает, на какую.';
        else if (t === 'banana') h = m.stage === 'dir' ? 'Выберите соседнюю клетку: в эту сторону поскользнётся фигура. Ход не тратится.' : 'Выберите свободную клетку для невидимой банановой кожуры. Ход не тратится.';
        else if (t === 'jaws') h = 'Выберите свободную клетку на первых трёх горизонталях вашей стороны: там появятся заводные челюсти.';
        else if (t === 'tomato') h = '🍅 Нажмите на способность врага в его панели: она отключится на ' + CONFIG.tomatoTurns + ' ходов. Ход не тратится.';
        else if (t === 'kghost') h = 'Король ушёл из-под шаха: выберите клетку, где останется его иллюзия.';
        if (m.via) h = '🪞 Зеркало: ' + h;
    } else if (G.sel && G.board[G.sel.r][G.sel.c] && G.board[G.sel.r][G.sel.c].betray === G.turn && G.board[G.sel.r][G.sel.c].c !== G.turn) {
        h = '🃏 Нажмите на фигуру ещё раз: она навсегда перейдёт на вашу сторону. Это тратит ход.';
    } else if (G.archUsed) {
        h = '🧰 Ходить фигурой уже нельзя: можно применить ещё способность или нажать «Завершить ход».';
    } else if (G.bonus) {
        h = G.bonus.kind === 'zw'
            ? (G.bonus.step === 1 ? '🕰️ ZA WARUDO: первый ход, им нельзя ни шаховать, ни рубить.' : '🕰️ ZA WARUDO: второй ход, теперь можно шаховать и рубить.')
            : '🌾 Дополнительный ход: походите любой фигурой (способности недоступны, своих пешек рубить уже нельзя).';
    } else if (G.forced.length) {
        h = G.forcedKind === 'lure'
            ? 'Приманка: вы обязаны срубить фигуру с приманкой или встать на клетку с приманкой (подсвеченной фигурой).'
            : 'Зомби обязан рубить: ходите подсвеченным зомби (цель на ваш выбор).';
    } else if (G.check) {
        h = 'Королю угрожает опасность: нужно защититься.';
    }
    if (NET.on && G.turn !== NET.me) h = NET.lost ? 'Соединение потеряно.' : '⏳ Ход соперника...';
    hi.textContent = h;
    renderChat();
    const ni = $('#netInfo');
    ni.classList.toggle('hidden', !NET.on);
    if (NET.on) ni.textContent = `Онлайн: вы играете ${NET.me === 'w' ? 'белыми' : 'чёрными'}${G.turn === NET.me ? ' · ваш ход' : ''}${NET.lost ? ' · соединение потеряно' : ''}`;
}

function renderLog() {
    const ol = $('#log');
    // Все записи одного хода (ход фигурой, способности, события) идут под одним номером
    const groups = [];
    G.log.forEach(e => {
        const g = groups[groups.length - 1];
        if (e.n && g && g.n === e.n) g.items.push(e); else groups.push({ n: e.n, items: [e] });
    });
    ol.innerHTML = groups.map(g => {
        const who = (g.items.find(e => e.c === 'w' || e.c === 'b') || g.items[0]).c;
        if (!g.n) return `<li class="${who}" style="list-style:none">${g.items.map(e => e.text).join('<br>')}</li>`;
        return `<li class="${who}" value="${g.n}">${g.items.map((e, i) => (i ? `<div class="log-sub">${e.text}</div>` : e.text)).join('')}</li>`;
    }).join('');
    ol.scrollTop = ol.scrollHeight;
}

/* =====================================================================
   ЭКРАН ВЫБОРА ГЕРОЕВ И ПОДКЛЮЧЕНИЕ СОБЫТИЙ
   ===================================================================== */
const openHeroes = new Set();   // у каких героев раскрыто «Подробнее»

// Зелёный кружок «не тратит ход» (то же правило, что и в панели героя во время партии)
const FREE_DOT = '<i class="free-dot" title="Не тратит ход"></i>';
const abFreeDot = k => (ABILITIES[k].free ? FREE_DOT : '');
const psFreeDot = pk => ((pk === 'aim' || (pk === 'timeslow' && !CONFIG.timePassiveCostsTurn)) ? FREE_DOT : '');

function buildSetup() {
    const sb = $('#startBtn');
    if (NET.on) sb.textContent = NET.ready ? 'Отменить готовность' : 'Готов';
    else sb.textContent = 'Начать партию';
    ['w', 'b'].forEach(side => {
        if (NET.on && side !== NET.me) {          // героя соперника не показываем до начала партии
            $(`.side-pick[data-side="${side}"] .hero-list`).innerHTML =
                `<div class="opp-wait">${NET.oppReady ? '✅ Соперник готов' : '⏳ Соперник выбирает героя...'}</div>`;
            return;
        }
        $(`.side-pick[data-side="${side}"] .hero-list`).innerHTML = '<button class="rand-hero" type="button">🎲 Случайный герой</button>' + Object.entries(HEROES).map(([id, h]) => {
            const ps = PASSIVES[h.passive], open = openHeroes.has(id);
            return `
      <div class="hero-card ${selectedHeroes[side] === id ? 'chosen' : ''} ${open ? 'open' : ''}" data-hero="${id}">
        <div class="hc-head"><span class="hc-icon">${h.icon}</span>
          <div><div class="hc-name">${h.name}</div><div class="hc-tag">${h.tag}</div></div></div>
        <div class="hc-abs"><span class="chip chip-ps">${ps.icon} ${ps.name}${psFreeDot(h.passive)}</span>${h.abilities.map(k => `<span class="chip">${ABILITIES[k].icon} ${ABILITIES[k].name}${abFreeDot(k)}</span>`).join('')}</div>
        <button class="hc-more" type="button">${open ? 'Скрыть ▴' : 'Подробнее ▾'}</button>
        ${open ? `<div class="hc-details"><div class="hc-passive"><b>${ps.icon} Пассивка: ${ps.name}${psFreeDot(h.passive)}</b><br><span>${ps.desc}</span>${cdBadgeHTML(CONFIG.cooldown[h.passive])}</div>
        <ul>${h.abilities.map(k => `<li><b>${ABILITIES[k].icon} ${ABILITIES[k].name}${abFreeDot(k)}</b><br><span>${abilityDesc(k)}</span>${cdBadgeHTML(CONFIG.cooldown[k])}</li>`).join('')}</ul></div>` : ''}
      </div>`;
        }).join('');
    });
}

/* ---------- Доски (цвета плиток). Это личная настройка: у соперника онлайн она может быть другой ---------- */
const THEMES = [
    { id: 'pink', name: 'Розовая', light: '#fff3f8', dark: '#ff6ec7', frame: '#ff3fa4' },
    { id: 'classic', name: 'Классика', light: '#f0d9b5', dark: '#b58863', frame: '#5b3a1f' },
    { id: 'green', name: 'Зелёная', light: '#eeeed2', dark: '#769656', frame: '#3b5323' },
    { id: 'blue', name: 'Голубая', light: '#dee3e6', dark: '#8ca2ad', frame: '#4a6572' },
    { id: 'night', name: 'Ночная', light: '#8f9bbd', dark: '#2f3b57', frame: '#1c2438' },
    { id: 'violet', name: 'Фиолетовая', light: '#efe6ff', dark: '#9b7be0', frame: '#6a45c2' }
];
let themeId = 'pink';
try { const saved = localStorage.getItem('spellschess-theme'); if (THEMES.some(t => t.id === saved)) themeId = saved; } catch (e) { /* без сохранения */ }

function renderThemePicker() {
    $('#themeRow').innerHTML = THEMES.map(t => `
      <button class="theme-btn ${t.id === themeId ? 'chosen' : ''}" data-theme="${t.id}" type="button">
        <span class="tp"><i style="background:${t.light}"></i><i style="background:${t.dark}"></i><i style="background:${t.dark}"></i><i style="background:${t.light}"></i></span>
        <span>${t.name}</span></button>`).join('');
}

function applyTheme(id) {
    const t = THEMES.find(x => x.id === id) || THEMES[0];
    themeId = t.id;
    const root = document.documentElement;
    if (root && root.style && root.style.setProperty) {
        root.style.setProperty('--light', t.light);
        root.style.setProperty('--dark', t.dark);
        root.style.setProperty('--frame', t.frame);
    }
    try { localStorage.setItem('spellschess-theme', t.id); } catch (e) { /* без сохранения */ }
    renderThemePicker();
}

function openSetup() {
    buildSetup();
    NET.ready = false; NET.oppReady = false; NET.oppHero = null; NET.lastStart = null;
    buildSetup();
    const sn = $('#setupNet');
    sn.classList.toggle('hidden', !NET.on);
    if (NET.on) sn.textContent = `Вы играете ${NET.me === 'w' ? 'белыми' : 'чёрными'}. Выберите героя и нажмите «Готов»: партия начнётся, когда готовы оба. Героя соперника вы увидите только на старте.`;
    $('#gameover').classList.add('hidden');
    $('#promo').classList.add('hidden');
    $('#setup').classList.remove('hidden');
}

$('#setup').addEventListener('click', e => {
    const more = e.target.closest('.hc-more');
    if (more) {                                      // «Подробнее» не выбирает героя
        const id = more.closest('.hero-card').dataset.hero;
        if (openHeroes.has(id)) openHeroes.delete(id); else openHeroes.add(id);
        buildSetup();
        return;
    }
    const rb = e.target.closest('.rand-hero');
    if (rb) {
        const sd = rb.closest('.side-pick').dataset.side;
        if (NET.on && (sd !== NET.me || NET.ready)) return;
        const ids = Object.keys(HEROES);
        selectedHeroes[sd] = ids[Math.floor(Math.random() * ids.length)];
        buildSetup();
        setTimeout(() => { const ch = document.querySelector(`.side-pick[data-side="${sd}"] .hero-card.chosen`); if (ch) ch.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 50);
        return;
    }
    const card = e.target.closest('.hero-card');
    if (!card) return;
    const side = card.closest('.side-pick').dataset.side;
    if (NET.on && (side !== NET.me || NET.ready)) return;   // онлайн: героя выбираете только за себя и до нажатия «Готов»
    selectedHeroes[side] = card.dataset.hero;
    buildSetup();
});
function toggleReady() {
    NET.ready = !NET.ready;
    netSend({ t: 'ready', ready: NET.ready, hero: selectedHeroes[NET.me] });
    buildSetup();
    maybeStart();
}

// Партия начинается, когда оба нажали «Готов». Запускает хозяин комнаты и сообщает героев и общее число для случайностей.
function maybeStart() {
    if (!(NET.on && NET.host && NET.ready && NET.oppReady && NET.oppHero)) return;
    _seed = (Math.random() * 2147483647) | 0;
    const heroes = { w: selectedHeroes.w, b: NET.oppHero };
    NET.lastStart = { seed: _seed, heroes, tc: NET.tc || 0 };
    netSend({ t: 'start', ...NET.lastStart });
    selectedHeroes = heroes;
    NET.ready = false; NET.oppReady = false;
    startGame();
}

// Пока вы нажали «Готов», а партия не началась, раз в 3 секунды повторяем сигнал (на случай потерянного сообщения)
setInterval(() => {
    if (NET.on && !NET.lost && NET.ready && !$('#setup').classList.contains('hidden')) netSend({ t: 'ready', ready: true, hero: selectedHeroes[NET.me] });
}, 3000);

$('#startBtn').addEventListener('click', () => {
    if (NET.on) { toggleReady(); return; }
    _seed = (Math.random() * 2147483647) | 0;
    startGame();
});

$('#board').addEventListener('click', e => {
    const cell = e.target.closest('.cell');
    if (!cell || !G || G.over || G.pendingPromo) return;
    const r = +cell.dataset.r, c = +cell.dataset.c;
    if (CONFIRM.on && !(NET.on && (NET.lost || !isActor())) && needsConfirm(r, c)) {      // режим «подтверждать ход кнопкой»
        CONFIRM.pend = { r, c };
        render();
        return;
    }
    CONFIRM.pend = null;
    netDo({ t: 'cell', r, c });
});

$('#app').addEventListener('click', e => {
    if (!G || G.over || G.pendingPromo) return;
    const tm = e.target.closest('[data-tomato]');
    if (tm && !tm.disabled) { netDo({ t: 'tomato', k: tm.dataset.tomato }); return; }
    const sl = e.target.closest('[data-slow]');
    if (sl && !sl.disabled) { netDo({ t: 'slow', k: sl.dataset.slow }); return; }
    const ab = e.target.closest('[data-ab]');
    if (ab && !ab.disabled) { netDo({ t: 'ab', k: ab.dataset.ab }); return; }
    const gp = e.target.closest('[data-gi]');
    if (gp && !gp.disabled) netDo({ t: 'grave', i: +gp.dataset.gi, col: gp.dataset.col });
});

$('#promoBtns').addEventListener('click', e => {
    const b = e.target.closest('[data-promo]');
    if (!b || !G.pendingPromo) return;
    netDo({ t: 'promo', p: b.dataset.promo });
});

$('#btnNew').addEventListener('click', () => {
    if (!G || G.over || uiConfirm('Начать новую игру? Текущая партия будет потеряна.')) {
        netSend({ t: 'abort' });
        openSetup();
    }
});
$('#goNew').addEventListener('click', openSetup);
$('#goView').addEventListener('click', () => $('#gameover').classList.add('hidden'));
$('#btnEnd').addEventListener('click', () => {
    if (G && !G.over && G.archUsed && !G.check && !G.pendingPromo) netDo({ t: 'end' });
});

$('#btnResign').addEventListener('click', () => {
    if (!G || G.over) return;
    if (NET.on) {
        if (uiConfirm('Сдаться?')) { netSend({ t: 'resign' }); resignSide(NET.me); }
        return;
    }
    if (uiConfirm(`${colorName(G.turn)} сдаются?`)) resignSide(G.turn);
});
$('#btnDraw').addEventListener('click', () => {
    if (!G || G.over) return;
    if (NET.on) { netSend({ t: 'draw' }); uiAlert('Ничья предложена, ждём ответа соперника.'); return; }
    if (uiConfirm('Оба игрока согласны на ничью?')) drawGame();
});
$('#btnSound').addEventListener('click', e => {
    CONFIG.sound = !CONFIG.sound;
    e.currentTarget.textContent = CONFIG.sound ? '🔊' : '🔇';
});
$('#btnGhost').addEventListener('click', e => {
    showGhosts = !showGhosts;
    e.currentTarget.classList.toggle('off', !showGhosts);
    if (G) render();
});
$('#btnInvis').addEventListener('click', e => {
    showInvis = !showInvis;
    e.currentTarget.classList.toggle('off', !showInvis);
    if (G) render();
});
$('#btnTraps').addEventListener('click', e => {
    showTraps = !showTraps;
    e.currentTarget.classList.toggle('off', !showTraps);
    if (G) render();
});

document.addEventListener('keydown', e => { if (e.key === 'Escape' && G && !G.over) netDo({ t: 'esc' }); });

/* ---------- Комнаты (PeerJS: бесплатный сервис только знакомит игроков, дальше они соединяются напрямую) ---------- */
const PEER_PREFIX = 'spellschess-';
const PEER_OPTS = {
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' }
        ]
    }
};
/* ---------- Чат с соперником (можно заглушить) ---------- */
const chatMsgs = [];
const esc = t => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

function renderChat() {
    const el = $('#chatLog');
    el.innerHTML = chatMsgs.slice(-60).map(m => `<div class="chat-msg ${m.me ? 'me' : 'them'}"><b>${tr(m.me ? 'Вы' : 'Соперник')}:</b> ${esc(m.text)}</div>`).join('') +
        (NET.muted ? `<div class="chat-note">${tr('Сообщения соперника заглушены')}</div>` : '');
    el.scrollTop = el.scrollHeight;
    $('#chat').classList.toggle('hidden', !NET.on);
    $('#chatMute').textContent = NET.muted ? '🔕' : '🔔';
}

function sendChat() {
    const inp = $('#chatInput');
    const text = String(inp.value || '').trim().slice(0, 300);
    if (!text || !NET.on || NET.lost) return;
    inp.value = '';
    chatMsgs.push({ me: true, text });
    netSend({ t: 'chat', text });
    renderChat();
}

const lobbyStatus = t => { $('#lobbyStatus').textContent = t; };
const newCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

/* ---------- Запасной способ: через собственный сервер (server.js), по обычному TCP. Работает через Radmin VPN ---------- */
let RELAY = false;
let RELAY_CHECKED = false;
fetch('/ping').then(r => r.text()).then(t => {
    RELAY = t.trim() === 'spellschess';
    if (RELAY) lobbyStatus('Режим «через сервер» включён: создавайте комнату или входите по коду.');
}).catch(() => { }).finally(() => { RELAY_CHECKED = true; });

// На бесплатном Render сервер просыпается до минуты: пока не выяснили, есть ли сервер, комнату не создаём (иначе игра уйдёт в PeerJS и двое не соединятся)
function whenRelayChecked(fn) {
    if (RELAY_CHECKED) { fn(); return; }
    lobbyStatus('Сервер просыпается, подождите немного...');
    setTimeout(() => whenRelayChecked(fn), 1000);
}

function relayConn(code, role) {
    const h = {};
    let queue = Promise.resolve();
    const sid = Math.random().toString(36).slice(2, 12);
    let mid = 0;
    const es = new EventSource(`/events?room=${code}&role=${role}&sid=${sid}`);
    const conn = {
        open: false,
        on(ev, fn) { h[ev] = fn; },
        send(m) {
            const my = ++mid;
            queue = queue.then(async () => {      // до 4 попыток; сервер отбрасывает дубликаты по номеру
                for (let i = 0; i < 4; i++) {
                    try { const r = await fetch(`/send?room=${code}&role=${role}&sid=${sid}&mid=${my}`, { method: 'POST', body: JSON.stringify(m) }); if (r.ok) return; } catch (e) { /* повторим */ }
                    await new Promise(ok => setTimeout(ok, 700 * (i + 1)));
                }
            });
        },
        close() { es.close(); }
    };
    es.onmessage = e => {
        const m = JSON.parse(e.data);
        if (m.t === '__open') { if (!conn.open) { conn.open = true; if (h.open) h.open(); } }
        else if (m.t === '__close') { conn.open = false; if (h.close) h.close(); }
        else if (m.t === '__nohost') { lobbyStatus('Комнаты с таким кодом нет.'); es.close(); }
        else if (m.t === '__taken') { lobbyStatus('Такой код уже занят, нажмите «Создать комнату» ещё раз.'); es.close(); $('#lobbyHost').disabled = false; }
        else if (h.data) h.data(m);
    };
    es.onerror = () => { if (es.readyState === 2) { conn.open = false; if (h.close) h.close(); } };
    return conn;
}

function hostRoom() {
    if (RELAY) {
        const code = newCode();
        NET.host = true;
        $('#roomCode').textContent = code;
        $('#hostBox').classList.remove('hidden');
        lobbyStatus('Комната создана. Отправьте код другу и ждите, пока он зайдёт.');
        attachConn(relayConn(code, 'host'));
        return;
    }
    if (typeof Peer === 'undefined') { lobbyStatus('Не загрузилась библиотека PeerJS: проверьте интернет и обновите страницу.'); return; }
    const code = newCode();
    NET.host = true;
    const peer = NET.peer = new Peer(PEER_PREFIX + code, PEER_OPTS);
    peer.on('open', () => {
        $('#roomCode').textContent = code;
        $('#hostBox').classList.remove('hidden');
        lobbyStatus('Комната создана. Отправьте код другу и ждите, пока он зайдёт.');
    });
    peer.on('connection', c => { if (NET.conn) { c.close(); return; } attachConn(c); });
    peer.on('error', err => {
        if (err.type === 'unavailable-id') { peer.destroy(); hostRoom(); return; }
        lobbyStatus('Ошибка соединения: ' + err.type);
    });
}

function joinRoom() {
    const code = $('#joinCode').value.trim().toUpperCase();
    if (code.length < 4) { lobbyStatus('Введите код комнаты.'); return; }
    if (!RELAY && typeof Peer === 'undefined') { lobbyStatus('Не загрузилась библиотека PeerJS: проверьте интернет и обновите страницу.'); return; }
    NET.host = false;
    lobbyStatus('Подключаемся...');
    if (RELAY) { attachConn(relayConn(code, 'guest')); return; }
    const peer = NET.peer = new Peer(PEER_OPTS);
    peer.on('open', () => {
        attachConn(peer.connect(PEER_PREFIX + code, { reliable: true, serialization: 'json' }));
        setTimeout(() => { if (!NET.on) lobbyStatus('Не получилось подключиться. Проверьте код и попробуйте ещё раз.'); }, 20000);
    });
    peer.on('error', err => lobbyStatus(err.type === 'peer-unavailable' ? 'Комнаты с таким кодом нет.' : 'Ошибка соединения: ' + err.type));
}

function attachConn(c) {
    NET.conn = c;
    c.on('open', () => {
        NET.on = true;
        NET.me = NET.host ? 'w' : 'b';
        $('#lobby').classList.add('hidden');
        openSetup();
        tcOnOpen();
    });
    c.on('data', netRecv);
    c.on('close', () => {
        if (!NET.on) return;
        NET.lost = true;
        if (G) render();
        uiAlert('Соединение с соперником потеряно.');
    });
}

function netRecv(m) {
    switch (m.t) {
        case 'ready':
            // соперник всё ещё жмёт «Готов», хотя у нас партия уже началась: наше «start» потерялось, шлём ещё раз
            if (NET.host && NET.lastStart && m.ready && G && !G.over && ((G.done ? G.done.w + G.done.b : 0) === 0)) { netSend({ t: 'start', ...NET.lastStart }); break; }
            NET.oppReady = !!m.ready;
            NET.oppHero = m.ready ? m.hero : null;
            buildSetup();
            maybeStart();
            break;
        case 'start':
            if (!NET.host) { if (NET.lastSeed === m.seed && G && !G.over) break; NET.lastSeed = m.seed; if (m.tc !== undefined) NET.tc = m.tc; selectedHeroes = { ...m.heroes }; _seed = m.seed; NET.ready = false; NET.oppReady = false; startGame(); }
            break;
        case 'chat':
            if (!NET.muted && typeof m.text === 'string') { chatMsgs.push({ me: false, text: m.text.slice(0, 300) }); renderChat(); }
            break;
        case 'in':
            if (G && !G.over && G.turn !== NET.me) applyInput(m.m);
            break;
        case 'resign': resignSide(other(NET.me)); break;
        case 'draw':
            if (uiConfirm('Соперник предлагает ничью. Согласны?')) { netSend({ t: 'drawOk' }); drawGame(); }
            else netSend({ t: 'drawNo' });
            break;
        case 'drawOk': drawGame(); break;
        case 'drawNo': uiAlert('Соперник отказался от ничьей.'); break;
        case 'abort': openSetup(); break;
    }
}

$('#chatSend').addEventListener('click', sendChat);
$('#chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });
$('#chatMute').addEventListener('click', () => { NET.muted = !NET.muted; renderChat(); });
$('#themeRow').addEventListener('click', e => {
    const b = e.target.closest('[data-theme]');
    if (b) applyTheme(b.dataset.theme);
});
$('#btnTheme').addEventListener('click', () => applyTheme(THEMES[(THEMES.findIndex(t => t.id === themeId) + 1) % THEMES.length].id));
$('#lobbyLocal').addEventListener('click', () => $('#lobby').classList.add('hidden'));
$('#lobbyHost').addEventListener('click', () => { $('#lobbyHost').disabled = true; whenRelayChecked(hostRoom); });
$('#lobbyJoin').addEventListener('click', () => whenRelayChecked(joinRoom));
$('#lobbyQuick').addEventListener('click', async () => {
    while (!RELAY_CHECKED) { lobbyStatus('Сервер просыпается, подождите немного...'); await new Promise(ok => setTimeout(ok, 1000)); }
    if (!RELAY) { lobbyStatus('Быстрая игра работает только на сайте с сервером игры.'); return; }
    try {
        NET.pref = quickPref();
        const j = await (await fetch('/quick?tc=' + encodeURIComponent(NET.pref))).json();
        if (!j.room) { lobbyStatus('Сервер занят, попробуйте позже.'); return; }
        NET.host = j.role === 'host';
        lobbyStatus(NET.host ? 'Ищем соперника... оставайтесь на этой странице.' : 'Соперник найден, подключаемся...');
        attachConn(relayConn(j.room, j.role));
    } catch (e) { lobbyStatus('Не удалось связаться с сервером.'); }
});
$('#copyCode').addEventListener('click', () => {
    const t = $('#roomCode').textContent;
    if (navigator.clipboard) navigator.clipboard.writeText(t);
    lobbyStatus('Код скопирован: ' + t);
});


/* =====================================================================
   ЯЗЫК: русский / английский. Игра пишет всё по-русски, а при выборе English
   весь видимый текст переводится по словарю ниже (в тексте экрана, подсказках и окнах).
   ===================================================================== */
const EN = {
    "Воскрешение": "Resurrection",
    "Возвращает вашу фигуру из сброса на свободную клетку первой горизонтали (пешку на любую из первых четырёх).": "Returns your piece from the graveyard to a free square on your first rank (a pawn to any of the first four ranks).",
    "Око за око": "Eye for an Eye",
    "На ": "For ",
    " хода фигура получает шипы: срубивший её погибает.": " turns a piece gets thorns: whoever captures it dies.",
    "Спасение": "Rescue",
    "Переносит вашу фигуру с вражеской половины на свободную клетку первой горизонтали (пешку на 2–4).": "Moves your piece from the enemy half to a free square on your first rank (a pawn to ranks 2–4).",
    "Огненный шар": "Fireball",
    "Метка в радиусе 6 от короля. В начале вашего хода взрыв, затем клетка горит 3 хода: вставшие на неё и прошедшие сквозь фигуры сгорают (конь перепрыгивает). Уничтожает плитки.": "A mark within 6 squares of your king. It explodes at the start of your turn, then the square burns for 3 turns: pieces that stop on it or pass through it burn up (knights jump over). Destroys tiles.",
    "Заморозка": "Freeze",
    "Любая фигура (кроме короля) на ": "Any piece (except a king) for ",
    " хода не ходит, её нельзя срубить, и магия на неё не действует. Исключение: огненный шар.": " turns cannot move or be captured, and magic does not affect it. Exception: Fireball.",
    "Зеркало": "Mirror",
    "Повторяет последнюю способность врага.": "Repeats the enemy's last ability.",
    "Иллюзия": "Illusion",
    "Создаёт двойника фигуры. Они ходят только вместе, двойник никого не рубит и рассеивается, если ему или оригиналу что-то грозит.": "Creates a double of a piece. They move only together; the double captures nothing and fades if it or the original is threatened.",
    "Гипноз": "Hypnosis",
    "Вражеская фигура в радиусе 3×3 от вашей фигуры ходит за вас ": "An enemy piece within 3×3 of one of your pieces moves for you for ",
    " ваших хода или пока не срубит фигуру. Короля нельзя.": " of your turns, or until it captures a piece. Kings are immune.",
    "Замешательство": "Confusion",
    "Вражеская фигура (не король) делает два хода подряд по вашему выбору, без рубки.": "An enemy piece (not a king) makes two moves in a row of your choice, without capturing.",
    "Зомби": "Zombies",
    "Поднимает фигуру из любого сброса зомби на свободную клетку первой горизонтали (пешку на любую из первых четырёх).": "Raises a piece from any graveyard as a zombie on a free square of your first rank (a pawn on any of the first four ranks).",
    "Франкенштейн": "Frankenstein",
    "Фигура рубит свою фигуру и получает её ходы.": "A piece captures its own piece and gains its moves.",
    "Апокалипсис": "Apocalypse",
    "Дополнительный ход любым зомби (даже вражеским: он рубит своих), без обязательной рубки. Потом обычный ход.": "An extra move with any zombie (even an enemy one: it captures its own side), with no forced capture. Then a normal move.",
    "Прозрачность": "Transparency",
    "Фигура становится прозрачной для ваших фигур: они проходят сквозь неё, но не встают.": "A piece becomes transparent to your pieces: they pass through it but cannot stop on it.",
    "Соулмейты": "Soulmates",
    "Связывает две фигуры: когда одна погибает, все связанные фигуры в радиусе 3×3 от неё гибнут тоже.": "Links two pieces: when one dies, all linked pieces within 3×3 of it die too.",
    "Скример": "Screamer",
    "Дальность хода вражеской фигуры (не короля) становится 1: ладья по прямым, слон по диагонали, ферзь в любую сторону, конь как слон. Пешка идёт только на 1 вперёд и не рубит. Страх спадает после хода, у пешки и через ": "An enemy piece's (not a king's) move range becomes 1: rook straight, bishop diagonally, queen any direction, knight like a bishop. A pawn moves only 1 forward and cannot capture. Fear ends after the piece moves; for a pawn also after ",
    " хода.": " turns.",
    "Сёмен-ути": "Shomen-uchi",
    "Недоступен до первой смерти. Отмечает вертикаль: в начале вашего хода все фигуры на ней погибают.": "Unavailable until the first death. Marks a file: at the start of your turn all pieces on it die.",
    "Фукаши": "Fukashi",
    "Фигура невидима для врага, но блокирует ходы: пройти сквозь неё значит срубить её. Раскрывается, если срубила, дала шах или ей грозит пешка (по диагонали). Если пешка идёт прямо на неё или фигура, которую она связывает, пытается сойти с линии, невидимка раскрывается, а ход не тратится.": "A piece is invisible to the enemy but blocks moves: passing through it means capturing it. It is revealed if it captures, gives check, or is threatened by a pawn (diagonally). If a pawn moves straight into it, or a piece it pins tries to leave the line, it is revealed and the turn is not spent.",
    "Фен-Янь": "Fen-Yan",
    "Все клетки одного цвета острые на ваш ход и ход врага: вставшая на острую клетку фигура погибает. Клетки, на которых в момент применения стоят фигуры, острыми не становятся.": "All squares of one colour become sharp for your turn and the enemy's turn: a piece that stops on a sharp square dies. Squares occupied by pieces when it is cast do not become sharp.",
    "Конвейер": "Conveyor",
    "Плитка толкает фигуру на себе (и колонну перед ней) на клетку вперёд в конце каждого хода.": "A tile that pushes the piece on it (and the column in front of it) one square forward at the end of every turn.",
    "Порталы": "Portals",
    "Две связанные плитки: ход через портал продолжается из второго, вставшая фигура переносится на второй. Одновременно две пары.": "Two linked tiles: a move through one portal continues from the other; a piece that stops on one is carried to the other. Two pairs at a time.",
    "Перемещение": "Relocation",
    "Переносит любую плитку или портал на свободную клетку.": "Moves any tile or portal to a free square.",
    "Капкан": "Trap",
    "Невидимый капкан: вставшая на него фигура (не король) пропускает следующий ход.": "An invisible trap: a piece (not a king) that steps on it skips its next turn.",
    "Стрела": "Arrow",
    "Метка в радиусе 6 от короля: в начале вашего хода стрела убивает фигуру на ней.": "A mark within 6 squares of your king: at the start of your turn the arrow kills the piece on it.",
    "Ангел-хранитель": "Guardian Angel",
    " ходов союзная фигура самоотверженна: если рядом (3×3) другую союзную фигуру убивают (рубкой, огненным шаром, стрелой, взрывом и т. п.), она меняется с ней местами и гибнет вместо неё.": " turns an allied piece is selfless: if another allied piece next to it (3×3) is killed (by capture, fireball, arrow, explosion, etc.), it swaps places with it and dies instead.",
    "Очищение": "Purification",
    "Снимает с любой фигуры все эффекты (баффы и дебаффы) и на ": "Removes all effects (buffs and debuffs) from any piece and for ",
    " хода даёт защиту от магии.": " turns grants protection from magic.",
    "Ход — это ложь": "The Move Is a Lie",
    "Выберите клетку, куда встанет невидимая фигура, и клетку её иллюзии (оба хода обычные ходы фигуры). Невидимость и иллюзия раскрываются и рассеиваются по обычным правилам, ошибки игрока на его совести. После хода врага правда раскрывается.": "Choose the square for the invisible piece and the square for its illusion (both are normal moves of the piece). Invisibility and the illusion are revealed and fade by the usual rules; the player's mistakes are on them. After the enemy's move the truth is revealed.",
    "Вирус": "Virus",
    "Заражённая плитка: вставшая на неё фигура (не король) становится зомби.": "An infected tile: a piece (not a king) that steps on it becomes a zombie.",
    "Лоза": "Vine",
    "Лоза блокирует путь дальше себя. Исчезает, когда на неё встаёт фигура, или через ": "The vine blocks the path beyond it. It disappears when a piece steps on it, or after ",
    " ваших хода.": " of your turns.",
    "Ритуал": "Ritual",
    "Призрачная плитка: стоящая на ней фигура (своя или вражеская) прозрачна для ваших фигур. Сквозь вражескую фигуру на ней можно пройти и можно её срубить.": "A ghostly tile: a piece standing on it (yours or an enemy's) is transparent to your pieces. You can pass through an enemy piece on it, and also capture it.",
    "Бумпуку": "Bumpuku",
    "Бомба на союзной фигуре (не короле) взрывается на вашем ": "A bomb on an allied piece (not a king) explodes on your ",
    "-м ходе после применения и убивает всех в 3×3. Срубленная фигура не взрывается.": "th turn after use and kills everything in 3×3. A captured piece does not explode.",
    "Генератор": "Generator",
    "Плитки плюс и минус. Все плюсы связаны со всеми минусами: если фигуры стоят и на плюсе, и на минусе, их убивает разряд.": "Plus and minus tiles. Every plus is linked to every minus: if pieces stand on both a plus and a minus, a discharge kills them.",
    "Ход сурка": "Groundhog Move",
    "Ловушка (королю не страшна) стоит, пока не сработает один раз: фигура на ней возвращается туда, откуда пришла. На пустой клетке скрыта и ход не тратит, на фигуре видна, тратит ход и срабатывает на новую фигуру.": "A trap (kings are immune) stays until it triggers once: the piece on it goes back to where it came from. On an empty square it is hidden and costs no turn; on a piece it is visible, costs a turn, and triggers on a new piece.",
    "Два хода подряд, но первым ходом нельзя ни шаховать, ни рубить.": "Two moves in a row, but the first move can neither give check nor capture.",
    "Мисклик!": "Misclick!",
    "Отменяет ход противника и ваш предыдущий ход.": "Cancels the opponent's move and your previous move.",
    "Суперпозиция": "Superposition",
    "Одноразово: фигура (не король) не мешает, если на её клетку встала или прошла сквозь неё другая фигура, и возвращается на клетку прошлого хода. Если вернуться нельзя, ничего не происходит. Если на клетку возврата встала ходившая фигура, её рубят.": "One-time: a piece (not a king) does not block when another piece stops on or passes through its square, and returns to the square of its last move. If it cannot return, nothing happens. If the moving piece lands on the return square, it is captured.",
    "Приманка": "Lure",
    "Приманка на вашей фигуре (видна всем): вражеская фигура (не король) обязана срубить её или встать на её клетку.": "A lure on your piece (visible to all): an enemy piece (not a king) must capture it or step on its square.",
    "Братство": "Brotherhood",
    "Две пешки рядом на одной горизонтали нельзя срубить. Три и более подряд: эффекта нет.": "Two pawns side by side on one rank cannot be captured. Three or more in a row: no effect.",
    "Магический барьер": "Magic Barrier",
    "Ваши фигуры в радиусе 3×3 от короля неуязвимы для магии, их можно только срубить.": "Your pieces within 3×3 of your king are immune to magic; they can only be captured.",
    "Двоится в глазах": "Double Vision",
    "Король, ушедший из-под шаха сам, оставляет иллюзию на другой клетке, куда мог уйти. Она появляется одновременно с ним и дальше ходит с королём как обычная.": "A king that escapes check by itself leaves an illusion on another square it could have gone to. It appears at the same time and then moves with the king like a normal illusion.",
    "Жатва": "Harvest",
    "Можно рубить свои пешки: это даёт дополнительный ход (при шахе доп. хода нет, зато перезарядка способностей −1).": "You may capture your own pawns: this gives an extra move (if it gives check there is no extra move, but all cooldowns are reduced by 1).",
    "Паранормальщина": "Paranormal Activity",
    "Король прозрачен для ваших фигур. Рядом с вашей фигурой он может «вселиться» в цепочку ваших фигур (каждая в 3×3 от предыдущей) и появиться на свободной клетке в 3×3 от любой из них.": "The king is transparent to your pieces. Next to one of your pieces it can “possess” a chain of your pieces (each within 3×3 of the previous) and appear on a free square within 3×3 of any of them.",
    "Мастер на все руки": "Jack of All Trades",
    "За ход можно применить несколько способностей, но после первой фигурой ходить нельзя. Потом «Завершить ход».": "You may use several abilities per turn, but after the first you cannot move a piece. Then press “End turn”.",
    "Кагэватари": "Kagewatari",
    "Король телепортируется на любое безопасное свободное поле, даже из-под шаха. Второй клик по королю или кнопка. Тратит ход.": "The king teleports to any safe free square, even out of check. Click the king a second time or use the button. Costs a turn.",
    "Замедление времени": "Time Slow",
    "Второй клик по королю или кнопка, затем способность врага: её перезарядка +2 сейчас и +1 на всю партию, у остальных перезаряжающихся +1 сейчас. ": "Click the king a second time or use the button, then pick an enemy ability: its cooldown +2 now and +1 for the whole game; other recharging abilities +1 now. ",
    "Тратит ход.": "Costs a turn.",
    "Ход не тратится.": "Costs no turn.",
    " Перезарядка ": " Cooldown ",
    "Меткий глаз": "Sharp Eye",
    "Второй клик по королю или кнопка: метка стрелы в радиусе 3 шагов вокруг короля (шаг: на клетку вверх, вниз или вбок). Ход не тратится.": "Click the king a second time or use the button: an arrow mark within 3 steps of the king (a step is one square up, down or sideways). Costs no turn.",
    "Выберите клетку в пределах 3 шагов от короля. Ход не тратится.": "Choose a square within 3 steps of your king. Costs no turn.",
    "Паладин": "Paladin",
    "Защита и святость": "Protection & Holiness",
    "Маг": "Mage",
    "Классика": "Classic",
    "Экстрасенс": "Psychic",
    "Обман и контроль": "Deception & Control",
    "Некромант": "Necromancer",
    "Смерть и сшивка": "Death & Stitching",
    "Охотник": "Hunter",
    "Ловушки и добыча": "Traps & Prey",
    "Призрак": "Phantom",
    "Проклятия и скорость": "Curses & Speed",
    "Самурай": "Samurai",
    "Всё ради победы": "All for Victory",
    "Архитектор": "Architect",
    "Перестройка по своим правилам": "Rebuilding by Own Rules",
    "Повелитель времени": "Time Lord",
    "Похититель темпа": "Tempo Thief",
    "Белые": "White",
    "Чёрные": "Black",
    "ход": "turn",
    "хода": "turns",
    "ходов": "turns",
    " Перезарядка: ": " Cooldown: ",
    "⏳ Ход сурка: невидимая фигура вернулась назад": "⏳ Groundhog Move: an invisible piece went back",
    "⏳ Ход сурка: ": "⏳ Groundhog Move: ",
    " возвращается с ": " returns from ",
    " на ": " on ",
    "ей угрожает пешка": "a pawn threatens it",
    "она встала перед вражеской пешкой": "it stands in front of an enemy pawn",
    "шах": "check",
    " стала видимой (": " became visible (",
    "🎭 Иллюзия на ": "🎭 Illusion on ",
    " рассеялась (": " faded (",
    "оригинал исчез": "the original is gone",
    "ей что-то угрожало": "something threatened it",
    "Партия началась: Белые — ": "The game has started: White — ",
    ", Чёрные — ": ", Black — ",
    "🥷 Невидимая фигура сделала ход": "🥷 An invisible piece made a move",
    "конвейер": "conveyor",
    "плитку генератора": "generator tile",
    "заражённую плитку": "infected tile",
    "лозу": "vine",
    "призрачную плитку": "ghost tile",
    "🔥 Огонь уничтожает ": "🔥 Fire destroys the ",
    "удар Сёмен-ути": "Shomen-uchi strike",
    "⚔️ Сёмен-ути по вертикали ": "⚔️ Shomen-uchi on file ",
    "взрыв": "explosion",
    "💣 Бумпуку: взрыв на ": "💣 Bumpuku: explosion on ",
    "🏹 Стрела": "🏹 Arrow",
    "💥 Взрыв": "💥 Explosion",
    ": там никого нет": ": nobody is there",
    ": цель неуязвима для магии": ": the target is immune to magic",
    "стрела": "arrow",
    "огонь": "fire",
    " уничтожает ": " destroys ",
    "Мат!": "Checkmate!",
    " побеждают.": " win.",
    "Пат": "Stalemate",
    "У игрока нет возможных действий. Ничья.": "The player has no possible actions. Draw.",
    "Ничья": "Draw",
    "На доске остались только короли.": "Only kings are left on the board.",
    " сгорает на ": " burns on ",
    "🪤 Невидимая фигура попадает в капкан": "🪤 An invisible piece falls into a trap",
    " попадает в капкан на ": " falls into a trap on ",
    "☣️ Невидимая фигура заражена и становится зомби": "☣️ An invisible piece is infected and becomes a zombie",
    " заражена и становится зомби": " is infected and becomes a zombie",
    "⚡ Генератор: ": "⚡ Generator: ",
    " поражена разрядом": " was struck by the discharge",
    "острая клетка": "sharp square",
    " гибнет на острой клетке ": " dies on a sharp square ",
    "🗡 Острые клетки исчезли": "🗡 The sharp squares are gone",
    "😱 Пешка на ": "😱 The pawn on ",
    " больше не боится": " is no longer afraid",
    "🛡 Щит ": "🛡 Shield ",
    " рассеялся": " faded",
    " вырывается из-под гипноза": " breaks free of hypnosis",
    " и ": " and ",
    "👀 Двоится в глазах: король оставил свою иллюзию": "👀 Double Vision: the king left its illusion",
    " рассеялась (своя фигура)": " faded (own piece)",
    "оригинал изменился": "the original changed",
    " (на проходе)": " (en passant)",
    " 🌵 шипы уничтожили ": " 🌵 the thorns destroyed ",
    " срублена вернувшейся фигурой": " was captured by the returning piece",
    " погиб на острой клетке": " died on a sharp square",
    " сгорел в огне": " burned in the fire",
    " срубила фигуру и вырывается из-под гипноза": " captured a piece and breaks free of hypnosis",
    "👼 Ангел-хранитель: ": "👼 Guardian Angel: ",
    " с ": " from ",
    " меняется местами с ": " swaps places with ",
    " и гибнет вместо неё": " and dies in its place",
    "⚛ Суперпозиция: ": "⚛ Superposition: ",
    " возвращается на ": " returns to ",
    "она срубила фигуру": "it captured a piece",
    "☠️ Апокалипсис: обязательная рубка зомби отменена до конца хода": "☠️ Apocalypse: forced zombie captures are cancelled until the end of the turn",
    "🕰️ ZA WARUDO: второй ход": "🕰️ ZA WARUDO: second move",
    "🌾 Жатва с шахом: перезарядка способностей −1, доп. хода нет": "🌾 Harvest with check: cooldowns −1, no extra move",
    "🌾 Жатва: дополнительный ход": "🌾 Harvest: extra move",
    "🤥 Ход — это ложь: ": "🤥 The Move Is a Lie: ",
    " на самом деле на ": " is really on ",
    " (показывали ": " (shown on ",
    " самоотверженна (": " is selfless (",
    " очищена и защищена от магии (": " is purified and protected from magic (",
    ": заражённая плитка на ": ": infected tile on ",
    ": лоза на ": ": vine on ",
    ": призрачная плитка на ": ": ghost tile on ",
    ": бомба повешена на невидимую фигуру": ": a bomb was attached to an invisible piece",
    ": бомба на ": ": bomb on ",
    " (взрыв на ": " (explodes on your ",
    "-м вашем ходу)": "th turn)",
    " в суперпозиции": " is in superposition",
    " нацелен на ": " aimed at ",
    " (взрыв в начале вашего следующего хода)": " (explodes at the start of your next turn)",
    " нацелена на ": " aimed at ",
    " (прилетит в начале вашего следующего хода)": " (strikes at the start of your next turn)",
    ": капкан установлен (место скрыто)": ": trap set (location hidden)",
    " цепляется на ": " attaches to ",
    " лежит на ": " lies on ",
    " нацелен на вертикаль ": " aimed at file ",
    " (удар в начале вашего следующего хода)": " (strikes at the start of your next turn)",
    " стала прозрачной для своих": " became transparent to allies",
    "это была иллюзия": "it was an illusion",
    " по ": " at ",
    ": цель оказалась иллюзией и рассеялась": ": the target was an illusion and faded",
    " напугана (дальность хода 1": " is scared (move range 1",
    ": одна из фигур скрылась из виду": ": one of the pieces vanished from sight",
    " заморожен на ": " frozen for ",
    " подчиняется на ": " is controlled for ",
    "🎭 Иллюзия: ": "🎭 Illusion: ",
    "🧪 Франкенштейн: ": "🧪 Frankenstein: ",
    " поглощает ": " absorbs ",
    " и становится ": " and becomes ",
    "🪂 Спасение: ": "🪂 Rescue: ",
    "💫 Замешательство: ": "💫 Confusion: ",
    "вверх": "up",
    "вниз": "down",
    "влево": "left",
    "вправо": "right",
    ": толкает ": ": pushes ",
    ": плитка ": ": tile ",
    ": связь душ между ": ": soul link between ",
    "🔗 Связь душ: ": "🔗 Soul link: ",
    " гибнет вслед за ": " dies after ",
    " клетки острые (ваш ход и ход врага). Теперь сделайте ход": " squares are sharp (your turn and the enemy's turn). Now make a move",
    "🌀 Кагэватари: король ": "🌀 Kagewatari: king ",
    "🎯 Меткий глаз: стрела нацелена на ": "🎯 Sharp Eye: arrow aimed at ",
    " (ход не потрачен)": " (no turn spent)",
    " ZA WARUDO! Время остановлено: два хода подряд, первым нельзя ни шаховать, ни рубить": " ZA WARUDO! Time is stopped: two moves in a row, the first can neither give check nor capture",
    " Мисклик! Время отмотано: отменены ход противника и ваш предыдущий ход": " Misclick! Time is rewound: the opponent's move and your previous move are cancelled",
    ": временная ловушка на ": ": groundhog trap on ",
    ": временная ловушка установлена (место скрыто)": ": groundhog trap set (location hidden)",
    " +1 (и +1 навсегда)": " +1 (and +1 permanently)",
    " Замедление времени: перезарядка врага ": " Time Slow: enemy cooldown ",
    ": плюс ": ": plus ",
    ", минус ": ", minus ",
    "Рокировка (ОК) или обычный ход короля без ладьи (Отмена)?": "Castle (OK) or a normal king move without the rook (Cancel)?",
    "Сдача": "Resignation",
    "Ничья по согласию.": "Draw by agreement.",
    "</span> Пассивка: <b>": "</span> Passive: <b>",
    "готово": "ready",
    "перезарядка: ": "cooldown: ",
    "доп. ход": "extra move",
    "приманка": "lure",
    "зомби рубит": "zombie must capture",
    "до первой смерти": "until the first death",
    "нет целей": "no targets",
    "скрыто": "hidden",
    "бесплатно": "free",
    "Сброс:": "Graveyard:",
    "пусто": "empty",
    "Ход: ": "Turn: ",
    " · ZA WARUDO, ход ": " · ZA WARUDO, move ",
    " · доп. ход": " · extra move",
    " · ШАХ!": " · CHECK!",
    " · шах после взрыва!": " · check after the explosion!",
    "Выберите фигуру или способность героя.": "Select a piece or a hero ability.",
    "🎭 Оригинал и двойник ходят вместе: теперь сходите второй фигурой пары (кликните на неё).": "🎭 The original and the double move together: now move the second piece of the pair (click it).",
    "Выберите свободную клетку на своей первой горизонтали (пешка: на любой из первых четырёх).": "Choose a free square on your first rank (pawn: any of the first four ranks).",
    "Выберите фигуру в своём сбросе.": "Choose a piece in your graveyard.",
    "Выберите клетку на своей первой горизонтали: там встанет зомби.": "Choose a square on your first rank: the zombie will stand there.",
    "Выберите фигуру в любом сбросе: своём или чужом.": "Choose a piece in any graveyard: yours or the enemy's.",
    "Выберите свою фигуру, на которую повесить щит.": "Choose your piece to put the shield on.",
    "Выберите свою фигуру на вражеской половине.": "Choose your piece on the enemy half.",
    "Выберите свободную клетку на своей первой горизонтали (пешка: на 2–4 горизонталь).": "Choose a free square on your first rank (pawn: ranks 2–4).",
    "Выберите клетку. Она взорвётся в начале вашего следующего хода и останется гореть.": "Choose a square. It will explode at the start of your next turn and keep burning.",
    "Выберите фигуру для заморозки (можно и свою, кроме короля).": "Choose a piece to freeze (your own too, except the king).",
    "Выберите вражескую фигуру в радиусе 3×3 от любой вашей.": "Choose an enemy piece within 3×3 of any of yours.",
    "Выберите фигуру, которая сходит и создаст двойника.": "Choose the piece that will move and create a double.",
    "Куда пойдёт фигура?": "Where will the piece go?",
    "На какую клетку встанет двойник?": "Which square will the double stand on?",
    "Выберите вражескую фигуру (не короля).": "Choose an enemy piece (not the king).",
    "Первый ход этой фигуры (без рубки).": "This piece's first move (no capture).",
    "Второй ход этой фигуры (без рубки).": "This piece's second move (no capture).",
    "Выберите свою фигуру, которая поглотит другую.": "Choose your piece that will absorb another.",
    "Выберите свою фигуру, которую она поглотит.": "Choose your piece to be absorbed.",
    "Выберите своего зомби для дополнительного хода.": "Choose your zombie for the extra move.",
    "Куда пойдёт зомби? Рубить не обязательно.": "Where will the zombie go? Capturing is optional.",
    "Выберите свободную клетку для конвейера.": "Choose a free square for the conveyor.",
    "В какую сторону он толкает? Выберите соседнюю клетку в этом направлении.": "Which way does it push? Choose the adjacent square in that direction.",
    "Выберите клетку первого портала.": "Choose the square of the first portal.",
    "Выберите клетку второго портала.": "Choose the square of the second portal.",
    "Выберите особую клетку (огонь, метка, конвейер, портал, приманка).": "Choose a special square (fire, mark, conveyor, portal, lure).",
    "Куда перенести её? Нужна клетка без особых свойств.": "Where to move it? The square must have no special properties.",
    "Выберите свободную клетку для невидимого капкана.": "Choose a free square for the invisible trap.",
    "Выберите клетку в радиусе от короля. Стрела прилетит в начале вашего следующего хода.": "Choose a square within range of your king. The arrow strikes at the start of your next turn.",
    "Выберите свободную клетку или свою фигуру для приманки.": "Choose a free square or your own piece for the lure.",
    "Выберите клетку: ": "Choose a square: ",
    " вперёд и ": " forward and ",
    " в сторону от короля. Ход не тратится.": " sideways from the king. Costs no turn.",
    "Выберите свободное безопасное поле для короля. Это тратит ход.": "Choose a free safe square for the king. This costs a turn.",
    "Выберите любую клетку нужной вертикали. В начале вашего следующего хода все фигуры на ней погибнут (кроме королей).": "Choose any square on the file you want. At the start of your next turn all pieces on it die (except kings).",
    "Выберите свою фигуру (не короля), сквозь которую смогут проходить ваши фигуры.": "Choose your piece (not the king) that your pieces will be able to pass through.",
    "Выберите первую фигуру для связи душ.": "Choose the first piece for the soul link.",
    "Выберите вторую фигуру.": "Choose the second piece.",
    "Выберите вражескую фигуру, которую нужно напугать.": "Choose the enemy piece to scare.",
    "Выберите союзную фигуру (не короля): она станет самоотверженной.": "Choose an allied piece (not the king): it will become selfless.",
    "Выберите любую фигуру: с неё снимутся все эффекты, и она получит защиту от магии.": "Choose any piece: all effects are removed from it and it gains protection from magic.",
    "Выберите свободную клетку для заражённой плитки.": "Choose a free square for the infected tile.",
    "Выберите свободную клетку для лозы.": "Choose a free square for the vine.",
    "Выберите свободную клетку для призрачной плитки.": "Choose a free square for the ghost tile.",
    "Выберите союзную фигуру (не короля), на которую повесить бомбу.": "Choose an allied piece (not the king) to attach the bomb to.",
    "Выберите свободную клетку для плитки ПЛЮС.": "Choose a free square for the PLUS tile.",
    "Выберите свободную клетку для плитки МИНУС.": "Choose a free square for the MINUS tile.",
    "Выберите клетку для временной ловушки. Пустая: скрыто и бесплатно. С фигурой: видно, тратит ход.": "Choose a square for the groundhog trap. Empty: hidden and free. With a piece: visible, costs a turn.",
    "Выберите фигуру, которая сделает ложный ход.": "Choose the piece that will make the false move.",
    "Выберите клетку НЕВИДИМОЙ фигуры (настоящий ход).": "Choose the square of the INVISIBLE piece (the real move).",
    "Выберите клетку ИЛЛЮЗИИ (фейковый ход).": "Choose the square of the ILLUSION (the fake move).",
    "Выберите любую фигуру (кроме короля): она получит суперпозицию.": "Choose any piece (except the king): it gains superposition.",
    "Выберите способность врага в его панели: её перезарядка +2 сейчас и +1 до конца партии, у остальных (если они перезаряжаются) +1.": "Choose an enemy ability in its panel: its cooldown +2 now and +1 for the rest of the game; the others (if recharging) +1.",
    "Выберите свою фигуру, которая станет невидимой.": "Choose your piece that will become invisible.",
    "Выберите любую клетку нужного цвета: все клетки этого цвета станут острыми. Потом сделайте ход.": "Choose any square of the colour you want: all squares of that colour become sharp. Then make a move.",
    "Король ушёл из-под шаха: выберите клетку, где останется его иллюзия.": "The king escaped check: choose the square where its illusion will stay.",
    "🪞 Зеркало: ": "🪞 Mirror: ",
    "🧰 Ходить фигурой уже нельзя: можно применить ещё способность или нажать «Завершить ход».": "🧰 You can no longer move a piece: use another ability or press “End turn”.",
    "🕰️ ZA WARUDO: первый ход, им нельзя ни шаховать, ни рубить.": "🕰️ ZA WARUDO: first move, it can neither give check nor capture.",
    " (иллюзия сразу рассеялась: ": " (the illusion faded at once: ",
    " стала невидимой": " became invisible",
    " острая клетка": " sharp tile",
    " горящая клетка": " burning tile",
    "🕰️ ZA WARUDO: второй ход, теперь можно шаховать и рубить.": "🕰️ ZA WARUDO: second move, check and captures are allowed now.",
    "🌾 Дополнительный ход: походите любой фигурой (способности недоступны, своих пешек рубить уже нельзя).": "🌾 Extra move: move any piece (abilities are unavailable, you can no longer capture your own pawns).",
    "Приманка: вы обязаны срубить фигуру с приманкой или встать на клетку с приманкой (подсвеченной фигурой).": "Lure: you must capture the piece with the lure or step on the lure's square (with the highlighted piece).",
    "Зомби обязан рубить: ходите подсвеченным зомби (цель на ваш выбор).": "A zombie must capture: move the highlighted zombie (target of your choice).",
    "Королю угрожает опасность: нужно защититься.": "Your king is in danger: defend it.",
    "Соединение потеряно.": "Connection lost.",
    "⏳ Ход соперника...": "⏳ Opponent's turn...",
    "Онлайн: вы играете ": "Online: you play ",
    "Отменить готовность": "Cancel ready",
    "Готов": "Ready",
    "Начать партию": "Start game",
    " Пассивка: ": " Passive: ",
    "Розовая": "Pink",
    "Зелёная": "Green",
    "Голубая": "Light blue",
    "Ночная": "Night",
    "Фиолетовая": "Violet",
    "Вы играете ": "You play ",
    ". Выберите героя и нажмите «Готов»: партия начнётся, когда готовы оба. Героя соперника вы увидите только на старте.": ". Choose a hero and press “Ready”: the game starts when both are ready. You will see the opponent's hero only at the start.",
    "Начать новую игру? Текущая партия будет потеряна.": "Start a new game? The current game will be lost.",
    "Сдаться?": "Resign?",
    " сдаются?": " resign?",
    "Ничья предложена, ждём ответа соперника.": "Draw offered, waiting for the opponent's answer.",
    "Оба игрока согласны на ничью?": "Do both players agree to a draw?",
    "Вы": "You",
    "Соперник": "Opponent",
    "Сообщения соперника заглушены": "Opponent's messages are muted",
    "Режим «через сервер» включён: создавайте комнату или входите по коду.": "Server mode is on: create a room or join by code.",
    "Комната создана. Отправьте код другу и ждите, пока он зайдёт.": "Room created. Send the code to a friend and wait for them to join.",
    "Не загрузилась библиотека PeerJS: проверьте интернет и обновите страницу.": "The PeerJS library failed to load: check your internet and reload the page.",
    "Ошибка соединения: ": "Connection error: ",
    "Введите код комнаты.": "Enter the room code.",
    "Подключаемся...": "Connecting...",
    "Не получилось подключиться. Проверьте код и попробуйте ещё раз.": "Could not connect. Check the code and try again.",
    "Комнаты с таким кодом нет.": "There is no room with that code.",
    "Соединение с соперником потеряно.": "The connection with the opponent was lost.",
    "Соперник предлагает ничью. Согласны?": "The opponent offers a draw. Do you accept?",
    "Соперник отказался от ничьей.": "The opponent declined the draw.",
    "Быстрая игра работает только на сайте с сервером игры.": "Quick game works only on the site with the game server.",
    "Сервер занят, попробуйте позже.": "The server is busy, try again later.",
    "Ищем соперника... оставайтесь на этой странице.": "Looking for an opponent... stay on this page.",
    "Соперник найден, подключаемся...": "Opponent found, connecting...",
    "Не удалось связаться с сервером.": "Could not reach the server.",
    "Код скопирован: ": "Code copied: ",
    "Такой код уже занят, нажмите «Создать комнату» ещё раз.": "That code is already taken, press “Create room” again.",
    "✅ Соперник готов": "✅ Opponent is ready",
    "⏳ Соперник выбирает героя...": "⏳ Opponent is choosing a hero...",
    "Подробнее ▾": "Details ▾",
    "Скрыть ▴": "Hide ▴",
    "Каждая сторона выбирает героя. В свой ход можно либо походить фигурой, либо применить способность героя. Все способности стартуют с перезарядкой 3.": "Each side picks a hero. On your turn you either move a piece or use a hero ability. All abilities start with a cooldown of 3.",
    "Доска": "Board",
    "☕ Поддержать проект": "☕ Support the project",
    "Автор проекта: FrouzyG ·": "Project author: FrouzyG ·",
    "Telegram-канал": "Telegram channel",
    "Как будете играть?": "How do you want to play?",
    "Вдвоём за одним экраном": "Two players on one screen",
    "онлайн": "online",
    "Быстрая игра: найти соперника": "Quick game: find an opponent",
    "или с другом по коду": "or with a friend by code",
    "Создать комнату": "Create room",
    "Код комнаты:": "Room code:",
    "Копировать": "Copy",
    "Вам, как хозяину комнаты, вводить код не нужно: просто отправьте его другу.": "As the room host you do not need to enter the code: just send it to your friend.",
    "Войти": "Join",
    "Сдаться": "Resign",
    "Новая игра": "New game",
    "Завершить ход": "End turn",
    "Шут": "Jester",
    "Трюки и сюрпризы": "Tricks and surprises",
    "Притворство": "Pretense",
    "Бриллиантовый зевок": "Brilliant Blunder",
    "Банановая кожура": "Banana Peel",
    "Заводные челюсти": "Windup Jaws",
    "Красная обструкция": "Red Obstruction",
    "В начале партии тайно выберите вражеского слона или коня: Предательство. Враг ходит ею как обычно. После 10-го хода врага можно потратить ход и дважды нажать на неё: она навсегда сменит цвет и будет подчиняться только вам (в этот ход сама не ходит).": "At the start of the game, secretly pick an enemy bishop or knight: Betrayal. The enemy moves it as usual. After the enemy's 10th move you can spend your turn and click it twice: it changes color for good and obeys only you (it does not move on that turn).",
    "Шутовской колпак на вашу фигуру (враг не видит, на какую): 2 хода врага она не может рубить и создавать шахи. Срубивший её погибает, а колпак слетает. Перед третьим ходом врага колпак слетает сам: фигура снова создаёт угрозу, и её можно срубить.": "A jester's hat on your piece (the enemy cannot see which): for 2 enemy turns it cannot capture or give check. Whoever captures it dies, and the hat falls off. Before the enemy's third turn the hat falls off by itself: the piece threatens again and can be captured.",
    "Невидимая для врага кожура на свободной клетке с направлением (вверх, вниз, влево, вправо): вставшая на неё фигура (не король) поскальзывается и съезжает на соседнюю клетку в эту сторону, кожура исчезает. Ход не тратится.": "A peel invisible to the enemy on a free square with a direction (up, down, left, right): a piece (not a king) that steps on it slips onto the neighbouring square in that direction and the peel vanishes. Costs no turn.",
    "Фигура на первых трёх горизонталях вашей стороны: ходит и рубит на 1 клетку по вертикали и горизонтали, живёт 3 ваших хода. Её можно срубить.": "A piece on the first three ranks of your side: moves and captures 1 square vertically and horizontally, lives for 3 of your turns. It can be captured.",
    "Помидор в одну из способностей врага: она отключается на 5 ходов врага (перезарядка идёт как обычно). Нельзя бросить в уже отключённую способность. Ход не тратится.": "A tomato at one of the enemy's abilities: it is disabled for 5 enemy turns (its cooldown keeps running as usual). Cannot be thrown at an ability that is already disabled. Costs no turn.",
    "🍅 уже отключена": "🍅 already disabled",
    "(ход не потрачен)": "(no turn spent)",
    "🃏 Одна из фигур готова предавать": "🃏 One of the pieces is ready to betray",
    "🃏 Притворство: выберите вражеского слона или коня. Это тайно, враг ничего не увидит. После 10-го хода врага можно будет потратить ход и дважды нажать на неё: она перейдёт к вам навсегда.": "🃏 Pretense: choose an enemy bishop or knight. It is secret, the enemy sees nothing. After the enemy's 10th move you can spend a turn and click it twice: it becomes yours for good.",
    "🃏 Нажмите на фигуру ещё раз: она навсегда перейдёт на вашу сторону. Это тратит ход.": "🃏 Click the piece once more: it will switch to your side for good. This costs your turn.",
    " должна была погибнуть": " was supposed to die",
    "✴ Невидимая фигура под Очищением уничтожает капкан": "✴ An invisible piece under Purify destroys the trap",
    "✴ Невидимая фигура под Очищением уничтожает банановую кожуру": "✴ An invisible piece under Purify destroys the banana peel",
    " под Очищением уничтожает капкан на ": " under Purify destroys the trap on ",
    " под Очищением уничтожает кожуру на ": " under Purify destroys the peel on ",
    "Выберите свою фигуру (не короля): на неё наденется шутовской колпак. Враг не узнает, на какую.": "Choose your piece (not the king): it gets a jester's hat. The enemy will not know which.",
    "Выберите соседнюю клетку: в эту сторону поскользнётся фигура. Ход не тратится.": "Choose a neighbouring square: a piece will slip in that direction. Costs no turn.",
    "Выберите свободную клетку для невидимой банановой кожуры. Ход не тратится.": "Choose a free square for an invisible banana peel. Costs no turn.",
    "Выберите свободную клетку на первых трёх горизонталях вашей стороны: там появятся заводные челюсти.": "Choose a free square on the first three ranks of your side: windup jaws will appear there.",
    "🍅 Нажмите на способность врага в его панели: она отключится на 5 ходов. Ход не тратится.": "🍅 Click an enemy ability in its panel: it will be disabled for 5 turns. Costs no turn.",
    "🃏 Шут: Притворство применено втайне": "🃏 Jester: Pretense used in secret",
    "🃏 Предательство: ": "🃏 Betrayal: ",
    " переходит на сторону Шута": " switches to the Jester's side",
    "🤡 Колпак слетел с ": "🤡 The hat fell off ",
    ": время вышло": ": time is up",
    ": фигура погибла": ": the piece died",
    " (Очищение)": " (Purify)",
    " осталась жива": " stayed alive",
    " погибла": " died",
    "🦷 Заводные челюсти на ": "🦷 Windup jaws on ",
    " ломаются и рассыпаются": " break and fall apart",
    "🍌 Банановая кожура: ловушка установлена (место скрыто, ход не потрачен)": "🍌 Banana Peel: trap set (location hidden, no turn spent)",
    "на одну из фигур надет шутовской колпак (на какую, знает только Шут)": "a jester's hat is put on one of the pieces (only the Jester knows which)",
    "🍅 сюда": "🍅 here",
    "🍅 отключена": "🍅 disabled",
    " отключена на ": " is disabled for ",
    "на её клетку попытались поставить плитку или ловушку": "someone tried to place a tile or trap on its square",
    "на неё применили Ход сурка": "Groundhog Move was used on it",
    "🎲 Случайный герой": "🎲 Random hero",
    " (две иллюзии столкнулись": " (two illusions collided",
    "две иллюзии столкнулись": "two illusions collided",
    "на её клетку попытались встать": "someone tried to stand on its square",
    "ей встали под угрозу": "someone stepped under its threat",
    "Время партии": "Game time",
    "Время партии: определится, когда подключится соперник.": "Game time: will be set when your opponent connects.",
    "Время партии: ": "Game time: ",
    " мин": " min",
    " на игрока": " per player",
    "без лимита": "no limit",
    "без ограничения времени": "no time limit",
    "Без лимита времени": "No time limit",
    "Любая": "Any",
    "По времени": "By time",
    "Без лимита": "No limit",
    "Искать партию:": "Find a game:",
    "Время вышло": "Time is up",
    " побеждают по времени.": " win on time.",
    "✔ Подтвердить": "✔ Confirm",
    "✖ Отмена": "✖ Cancel",
    "Подтверждение хода кнопкой: включено": "Move confirmation button: on",
    "Подтверждение хода кнопкой: выключено": "Move confirmation button: off",
    "📜 Журнал": "📜 Log",
    "💬 Чат": "💬 Chat",
    "☰ Меню": "☰ Menu",
    "✕ Закрыть": "✕ Close",
    "В начало партии": "To the start",
    "Ход назад": "Step back",
    "Ход вперёд": "Step forward",
    "К текущей позиции": "To the current position",
    "Чат": "Chat",
    "Журнал": "Log",
    "Особые правила": "Special rules",
    "Короли навсегда неуязвимы для магии.": "Kings are permanently immune to magic.",
    "Большинство способностей тратят ход. Те, что ход не тратят, отмечены зелёным кружком справа от названия.": "Most abilities cost a turn. Those that do not are marked with a green dot to the right of the name.",
    "Все способности стартуют с перезарядкой 3.": "All abilities start with a cooldown of 3.",
    "Описание способности и пассивки видно во всплывающей подсказке при наведении на кнопку.": "The description of an ability or passive is shown in a tooltip when you hover over the button.",
    "Если визуально ход сделать невозможно, это не значит, что он невозможен на самом деле: невидимые фигуры, иллюзии, скрытые ловушки и фейки могут менять картину.": "If a move looks impossible, that does not mean it really is: invisible pieces, illusions, hidden traps and fakes can change the picture.",
    "После мата можно нажать «Посмотреть доску» и рассмотреть финальную позицию.": "After checkmate you can press “View board” to study the final position.",
    "Esc отменяет выбор.": "Esc cancels the selection.",
    "Превращение пешки": "Pawn promotion",
    "Посмотреть доску": "View board",
    "Сыграть ещё": "Play again",
    "КОД": "CODE",
    "Звук": "Sound",
    "Сменить доску": "Change board",
    "Подсвечивать иллюзии Экстрасенса": "Highlight Psychic illusions",
    "Показывать капканы Охотника": "Show Hunter traps",
    "Показывать невидимые фигуры Самурая": "Show Samurai invisible pieces",
    "Архитектор: закончить ход после способностей": "Architect: end the turn after abilities",
    "Заглушить соперника": "Mute opponent",
    "Сообщение...": "Message...",
    "Выберите героя в левой колонке": "Choose a hero in the left column",
    "Выберите героя в правой колонке": "Choose a hero in the right column",
    "Классика ": "Classic ",
    "Ожидание": "Waiting",
    "белыми": "white",
    "чёрными": "black",
    "белые": "white",
    "чёрные": "black",
    "погибли ": "died: ",
    "никого не задело": "nobody was hit",
    "светлые": "light",
    "тёмные": "dark",
    " · соединение потеряно": " · connection lost",
    "Не тратит ход": "Costs no turn",
    "встаёт зомби": "rises as a zombie",
    "возвращается": "returns",
    "👤 Войти / Регистрация": "👤 Sign in / Sign up",
    "Выйти": "Sign out",
    "Вход": "Sign in",
    "Регистрация": "Sign up",
    "Войти через Google": "Sign in with Google",
    "или по почте": "or with email",
    "Почта": "Email",
    "Пароль (от 6 символов)": "Password (6+ characters)",
    "Ник (3–16 символов)": "Nickname (3–16 characters)",
    "Нет аккаунта? Регистрация": "No account? Sign up",
    "Уже есть аккаунт? Войти": "Already have an account? Sign in",
    "Закрыть": "Close",
    "Как вас называть?": "Choose a nickname",
    "Сохранить ник": "Save nickname",
    "Введите почту и пароль.": "Enter email and password.",
    "Пароль должен быть не короче 6 символов.": "Password must be at least 6 characters.",
    "Ник: 3–16 символов, буквы, цифры, пробел, _ и -.": "Nickname: 3–16 characters, letters, digits, space, _ and -.",
    "Неверная почта или пароль.": "Wrong email or password.",
    "Эта почта уже зарегистрирована. Нажмите «Войти».": "This email is already registered. Press “Sign in”.",
    "Письмо отправлено. Подтвердите почту по ссылке в письме и затем войдите.": "Email sent. Confirm your email via the link, then sign in.",
    "Подтвердите почту по ссылке из письма, затем войдите.": "Confirm your email via the link, then sign in.",
    "Слишком много попыток, подождите немного.": "Too many attempts, please wait a bit.",
    "Не загрузилась библиотека входа: проверьте интернет и обновите страницу.": "The sign-in library did not load: check your internet and refresh the page.",
    "Не удалось выполнить вход. Попробуйте ещё раз.": "Sign-in failed. Please try again."
};

let LANG = 'ru';
try {
    const saved = localStorage.getItem('spellschess-lang');
    LANG = saved || (String(navigator.language || 'ru').toLowerCase().startsWith('ru') ? 'ru' : 'en');
} catch (e) { /* язык по умолчанию */ }
const CYR = /[А-Яа-яЁё]/;
let EN_RULES = null;
const escRe = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function tr(str) {
    if (LANG !== 'en' || typeof str !== 'string' || !CYR.test(str)) return str;
    if (EN[str] !== undefined) return EN[str];
    if (!EN_RULES) {
        EN_RULES = Object.keys(EN).sort((a, b) => b.length - a.length).map(k => {
            const pre = CYR.test(k[0]) ? '(?<![А-Яа-яЁё])' : '';
            const post = CYR.test(k[k.length - 1]) ? '(?![А-Яа-яЁё])' : '';
            return [new RegExp(pre + escRe(k) + post, 'g'), EN[k]];
        });
    }
    let out = str;
    for (const [re, to] of EN_RULES) out = out.replace(re, () => to);
    return out.replace(/(returns from [a-h][1-8]) on /g, '$1 to ');
}
const uiAlert = m => alert(tr(m));
const uiConfirm = m => confirm(tr(m));

// Перевод экрана: текстовые узлы и подсказки (title, placeholder); оригинал хранится, чтобы вернуть русский
const TR_ATTRS = ['title', 'placeholder'];
const noTr = n => { const el = n.nodeType === 1 ? n : n.parentElement; return !!(el && el.closest && el.closest('[data-notr]')); };

function translateNode(n) {
    if (LANG !== 'en' || !n) return;
    if (n.nodeType === 3) {
        if (CYR.test(n.nodeValue) && !noTr(n)) {
            const t = tr(n.nodeValue);
            if (t !== n.nodeValue) { n.__ru = n.nodeValue; n.nodeValue = t; }     // без лишних записей, иначе наблюдатель зациклится
        }
    } else if (n.nodeType === 1) {
        if (n.tagName === 'SCRIPT' || n.tagName === 'STYLE') return;
        TR_ATTRS.forEach(a => {
            const v = n.getAttribute(a);
            if (v && CYR.test(v) && !noTr(n)) {
                const t = tr(v);
                if (t !== v) { (n.__ruAttr = n.__ruAttr || {})[a] = v; n.setAttribute(a, t); }
            }
        });
        n.childNodes.forEach(translateNode);
    }
}

function restoreNode(n) {
    if (!n) return;
    if (n.nodeType === 3) { if (n.__ru !== undefined) { n.nodeValue = n.__ru; delete n.__ru; } }
    else if (n.nodeType === 1) {
        if (n.__ruAttr) { Object.keys(n.__ruAttr).forEach(a => n.setAttribute(a, n.__ruAttr[a])); delete n.__ruAttr; }
        n.childNodes.forEach(restoreNode);
    }
}

function setLang(l) {
    restoreNode(document.body);
    LANG = l;
    try { localStorage.setItem('spellschess-lang', l); } catch (e) { /* без сохранения */ }
    if (document.documentElement) document.documentElement.lang = l;
    ['langLobby', 'langSetup', 'btnLang'].forEach(id => { $('#' + id).textContent = l === 'ru' ? '🌐 English' : '🌐 Русский'; });
    buildSetup();
    renderThemePicker();
    renderChat();
    if (G) render();
    translateNode(document.body);
}

if (typeof MutationObserver !== 'undefined' && document.body) {
    new MutationObserver(recs => {
        if (LANG !== 'en') return;
        recs.forEach(r => {
            if (r.type === 'childList') r.addedNodes.forEach(translateNode);
            else if (r.type === 'characterData') translateNode(r.target);
            else if (r.type === 'attributes') translateNode(r.target);
        });
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: TR_ATTRS });
}
['langLobby', 'langSetup', 'btnLang'].forEach(id => $('#' + id).addEventListener('click', () => setLang(LANG === 'ru' ? 'en' : 'ru')));

/* ---------- Свои модельки фигур: положите картинки в папку pieces (wK.png, bQ.png и т. д.) ---------- */
(function detectPieceImages() {
    if (typeof Image === 'undefined') return;
    const names = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'];
    const exts = ['png', 'svg', 'webp'];
    const tryExt = i => {
        if (i >= exts.length) return;
        const im = new Image();
        im.onload = () => {
            names.forEach(n => document.documentElement.style.setProperty('--img-' + n, `url("pieces/${n}.${exts[i]}")`));
            if (document.body) document.body.classList.add('img-pieces');
        };
        im.onerror = () => tryExt(i + 1);
        im.src = 'pieces/wK.' + exts[i];
    };
    tryExt(0);
})();

['donateLobby', 'donateSetup', 'donateGame'].forEach(id => {
    const a = $('#' + id);
    if (DONATE_URL) { a.href = DONATE_URL; a.classList.remove('hidden'); }
});
applyTheme(themeId);
buildSetup();
setLang(LANG);

// ===== Мобильная версия: строка статуса, нижняя панель и выезжающее окно «меню / журнал / чат» =====
(function () {
    const g = id => document.getElementById(id);
    const app = g('app'), st = g('status'), hi = g('hint'), ms = g('mStatus'), mh = g('mHint');
    const end = g('btnEnd'), mEnd = g('mEnd'), chat = g('chat'), mChat = g('mChat');
    if (!app || !ms || !mh || !mEnd || !mChat) return;

    const sync = () => {
        if (ms.textContent !== st.textContent) ms.textContent = st.textContent;
        const cls = 'm-status ' + st.className.replace('status', '').trim();
        if (ms.className !== cls) ms.className = cls;
        if (mh.textContent !== hi.textContent) mh.textContent = hi.textContent;
        mEnd.classList.toggle('hidden', end.classList.contains('hidden'));
        mEnd.disabled = end.disabled;
        mChat.classList.toggle('hidden', chat.classList.contains('hidden'));
    };
    const obs = new MutationObserver(sync);
    [st, hi].forEach(n => obs.observe(n, { childList: true, characterData: true, subtree: true, attributes: true }));
    obs.observe(end, { attributes: true });
    obs.observe(chat, { attributes: true });
    sync();

    const openSheet = target => {
        app.classList.add('sheet-open');
        setTimeout(() => { if (target) target.scrollIntoView({ block: 'start' }); else g('mClose').scrollIntoView({ block: 'start' }); }, 30);
    };
    const closeSheet = () => app.classList.remove('sheet-open');

    g('mMenu').addEventListener('click', () => openSheet(null));
    g('mLog').addEventListener('click', () => { openSheet(g('log').previousElementSibling); setTimeout(() => { const l = g('log'); l.scrollTop = l.scrollHeight; }, 80); });
    g('mChat').addEventListener('click', () => openSheet(chat));
    g('mClose').addEventListener('click', closeSheet);
    mEnd.addEventListener('click', () => end.click());
    app.addEventListener('click', e => { if (e.target === app) closeSheet(); });      // тап по затемнению закрывает окно
    ['btnDraw', 'btnResign', 'btnNew'].forEach(id => g(id).addEventListener('click', closeSheet));
})();


// ===== Кнопки только для тех героев, что есть в партии =====
function syncHeroButtons() {
    if (!G) return;
    const has = h => G.hero.w === h || G.hero.b === h;
    const set = (id, on) => { const b = document.getElementById(id); if (b) b.classList.toggle('nohero', !on); };
    set('btnGhost', has('hypnotist'));                      // иллюзии Экстрасенса
    set('btnTraps', has('hunter') || has('jester'));        // капканы Охотника и скрытое Шута (кожура, колпак, предатель)
    set('btnInvis', has('samurai') || has('hypnotist'));    // невидимки Самурая и Экстрасенса («Ход — это ложь»)
    // «Завершить ход» (Архитектор) скрывает updateEndBtn()
}

// ===== Перемотка ходов: только просмотр, партию не меняет =====
const REW = { snaps: [], idx: -1, g: null, lastLen: -1, broken: false, fresh: false, undo: false };   // idx -1: показываем текущую позицию

function takeSnap() {
    if (!G || REW.broken || !G.log) return;
    if (REW.g !== G || G.log.length < REW.lastLen) {
        let keep = -1;
        if (REW.undo && REW.snaps.length) {            // Мисклик: оставляем всё до отменённых ходов
            const want = G.log.length - 1;             // длина журнала до записи про мисклик
            for (let i = REW.snaps.length - 1; i >= 0; i--) if (REW.snaps[i].log.length === want) { keep = i; break; }
        }
        if (keep >= 0) { REW.snaps.length = keep + 1; REW.lastLen = REW.snaps[keep].log.length; REW.idx = Math.min(REW.idx, keep); REW.g = G; }
        else { REW.snaps = []; REW.idx = -1; REW.g = G; REW.lastLen = -1; REW.fresh = false; }   // новая партия
        REW.undo = false;
    }
    if (G.log.length === REW.lastLen) return;
    try {
        const { log, ...rest } = G;
        const snap = structuredClone(rest);
        snap.log = log.slice();
        snap.sel = null; snap.moves = []; snap.mode = null; snap.fx = [];
        REW.snaps.push(snap);
        REW.lastLen = G.log.length;
        if (REW.idx >= 0) REW.fresh = true;      // пока смотрели прошлое, в партии появился новый ход
    } catch (e) { REW.broken = true; }
}

const viewWrap = fn => function (...a) {
    const snap = REW.idx >= 0 ? REW.snaps[REW.idx] : null;
    if (snap && G !== snap) {
        const real = G;
        G = snap;
        try { return fn.apply(this, a); } finally { G = real; }
    }
    return fn.apply(this, a);
};
const _render = render;
render = function () {
    if (G) takeSnap();      // снимки делаем всегда, в том числе пока смотрим прошлое
    viewWrap(_render).call(this);
    syncHeroButtons();
    updateRewindUI();
};
renderPanels = viewWrap(renderPanels);
renderBoard = viewWrap(renderBoard);
renderStatus = viewWrap(renderStatus);
renderLog = viewWrap(renderLog);
updateEndBtn = viewWrap(updateEndBtn);

function rewindTo(i) {
    const last = REW.snaps.length - 1;
    if (last < 0) return;
    i = Math.max(0, Math.min(last, i));
    REW.idx = i === last ? -1 : i;
    if (REW.idx < 0) REW.fresh = false;
    render();
}
function rewindStep(d) {
    const last = REW.snaps.length - 1;
    const cur = REW.idx < 0 ? last : REW.idx;
    rewindTo(cur + d);
}

function updateRewindUI() {
    const box = document.getElementById('rewind');
    if (!box) return;
    const n = REW.snaps.length, last = n - 1;
    const cur = REW.idx < 0 ? last : REW.idx;
    box.classList.toggle('hidden', REW.broken || n < 2);
    document.getElementById('app').classList.toggle('viewing', REW.idx >= 0);
    document.getElementById('rwLabel').textContent = Math.max(cur, 0) + ' / ' + Math.max(last, 0);
    document.getElementById('rwStart').disabled = cur <= 0;
    document.getElementById('rwPrev').disabled = cur <= 0;
    document.getElementById('rwNext').disabled = cur >= last;
    document.getElementById('rwEnd').disabled = cur >= last;
    document.getElementById('rwEnd').classList.toggle('glow', REW.fresh && REW.idx >= 0);      // подсветка кнопки «к текущей позиции»
}

document.getElementById('rwStart').addEventListener('click', () => rewindTo(0));
document.getElementById('rwPrev').addEventListener('click', () => rewindStep(-1));
document.getElementById('rwNext').addEventListener('click', () => rewindStep(1));
document.getElementById('rwEnd').addEventListener('click', () => rewindTo(REW.snaps.length - 1));

// Пока смотрим прошлое, доска и панели героев не реагируют на нажатия
document.addEventListener('click', e => {
    if (REW.idx >= 0 && e.target.closest && e.target.closest('#board, .panel, #btnEnd, #mEnd')) { e.stopPropagation(); e.preventDefault(); }
}, true);
document.addEventListener('keydown', e => {
    if (!G || document.getElementById('app').classList.contains('hidden')) return;
    const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
    if (typing) return;
    if (e.key === 'ArrowLeft') { rewindStep(-1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { rewindStep(1); e.preventDefault(); }
    else if (e.key === 'Escape' && REW.idx >= 0) { e.stopImmediatePropagation(); rewindTo(REW.snaps.length - 1); }
}, true);


// ===== Телефон: описание способности по долгому нажатию =====
(function () {
    let timer = null, tip = null, suppress = false, hideT = null;
    const hideTip = () => { if (tip) { tip.remove(); tip = null; } clearTimeout(hideT); };
    const showTip = btn => {
        hideTip();
        const nameEl = btn.querySelector('.ab-name');
        const title = btn.getAttribute('title') || '';
        const head = nameEl ? nameEl.textContent.trim() : '';
        tip = document.createElement('div');
        tip.className = 'ab-tip';
        tip.setAttribute('data-notr', '');
        tip.innerHTML = (head ? '<b></b><br>' : '') + '<span></span>';
        if (head) tip.querySelector('b').textContent = head;
        tip.querySelector('span').textContent = title;
        document.body.appendChild(tip);
        hideT = setTimeout(hideTip, 6000);
    };
    const buttonAt = (panel, x, y) => Array.from(panel.querySelectorAll('.ab, .passive')).find(b => {
        const r = b.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
    document.addEventListener('pointerdown', e => {
        if (e.pointerType !== 'touch') return;
        const panel = e.target.closest && e.target.closest('.panel');
        if (!tip || !(e.target.closest && e.target.closest('.ab-tip'))) hideTip();
        if (!panel) return;
        const btn = buttonAt(panel, e.clientX, e.clientY);
        if (!btn) return;
        clearTimeout(timer);
        timer = setTimeout(() => { suppress = true; showTip(btn); if (navigator.vibrate) navigator.vibrate(15); }, 450);
    });
    const cancel = () => clearTimeout(timer);
    document.addEventListener('pointerup', () => { cancel(); if (suppress) setTimeout(() => { suppress = false; }, 400); });
    document.addEventListener('pointercancel', cancel);
    document.addEventListener('pointermove', e => { if (e.pointerType === 'touch' && Math.abs(e.movementX) + Math.abs(e.movementY) > 6) cancel(); });
    // после долгого нажатия отпускание не должно срабатывать как обычный клик
    document.addEventListener('click', e => { if (suppress) { e.stopPropagation(); e.preventDefault(); suppress = false; } }, true);
    document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.panel')) e.preventDefault(); });
})();


// ===== Подтверждение хода кнопкой (включается кнопкой ✅, по умолчанию выключено) =====
const CONFIRM = { on: false, pend: null };
try { CONFIRM.on = localStorage.getItem('sc_confirm') === '1'; } catch (e) { }

// Клик по клетке «завершает» действие: ход фигуры или выбор цели способности (выбор своей фигуры для способности не в счёт)
function needsConfirm(r, c) {
    if (!G || G.over) return false;
    if (G.pairStep) return !!(G.sel && G.moves.some(m => m.tr === r && m.tc === c));
    if (G.mode) {
        const m = G.mode;
        if (STAGED.includes(m.type) && m.stage === 'piece') return false;
        return !!(m.cells && m.cells.some(x => x[0] === r && x[1] === c));
    }
    return !!(G.sel && G.moves.some(m => m.tr === r && m.tc === c));
}

function updateConfirmUI() {
    if (CONFIRM.pend && (!G || G.over || REW.idx >= 0 || !needsConfirm(CONFIRM.pend.r, CONFIRM.pend.c))) CONFIRM.pend = null;
    const btn = document.getElementById('btnConfirm');
    if (btn) { btn.classList.toggle('off', !CONFIRM.on); btn.title = CONFIRM.on ? 'Подтверждение хода кнопкой: включено' : 'Подтверждение хода кнопкой: выключено'; }
    const app = document.getElementById('app');
    app.classList.toggle('confirm-pending', !!CONFIRM.pend);
    document.querySelectorAll('#board .cell.pending').forEach(el => el.classList.remove('pending'));
    if (CONFIRM.pend) {
        const el = document.querySelector(`#board .cell[data-r="${CONFIRM.pend.r}"][data-c="${CONFIRM.pend.c}"]`);
        if (el) el.classList.add('pending');
    }
}
const _renderConfirm = render;
render = function () { _renderConfirm.call(this); updateConfirmUI(); };

document.getElementById('btnConfirm').addEventListener('click', () => {
    CONFIRM.on = !CONFIRM.on;
    try { localStorage.setItem('sc_confirm', CONFIRM.on ? '1' : '0'); } catch (e) { }
    CONFIRM.pend = null;
    if (G) render(); else updateConfirmUI();
});
document.getElementById('cfOk').addEventListener('click', () => {
    const p = CONFIRM.pend;
    CONFIRM.pend = null;
    if (!p || !G || G.over) { if (G) render(); return; }
    netDo({ t: 'cell', r: p.r, c: p.c });
});
document.getElementById('cfNo').addEventListener('click', () => { CONFIRM.pend = null; render(); });
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && CONFIRM.pend) { e.stopImmediatePropagation(); CONFIRM.pend = null; render(); }
}, true);
updateConfirmUI();


// =====================================================================
//  ВРЕМЯ ПАРТИИ: выбор в лобби, шахматные часы, подбор соперника по времени
// =====================================================================
const TCSEL = { mins: 30, inf: false, quick: 'any' };     // mins — всего минут на партию (каждому поровну); quick: any | time | inf
try { Object.assign(TCSEL, JSON.parse(localStorage.getItem('sc_tc') || '{}')); } catch (e) { }
TCSEL.mins = Math.max(1, Math.min(180, +TCSEL.mins || 30));

const prefToTc = p => (p === 'inf' ? 0 : (+p || 30));                       // 0 = без лимита
const roomPref = () => (TCSEL.inf ? 'inf' : String(TCSEL.mins));
function quickPref() {
    if (TCSEL.quick === 'inf') return 'inf';
    if (TCSEL.quick === 'time') return roomPref();
    return 'any';
}
const fmtNum = n => String(n).replace('.', ',');
const fmtTc = tc => (tc > 0 ? `${fmtNum(tc)} мин (${fmtNum(tc / 2)} мин на игрока)` : 'без лимита');

function saveTc() { try { localStorage.setItem('sc_tc', JSON.stringify(TCSEL)); } catch (e) { } }
function renderTcBox() {
    const g = id => document.getElementById(id);
    g('tcVal').textContent = TCSEL.inf ? '∞' : `${TCSEL.mins} мин`;
    g('tcSub').textContent = TCSEL.inf ? 'без ограничения времени' : `${fmtNum(TCSEL.mins / 2)} мин на игрока`;
    g('tcInf').checked = TCSEL.inf;
    ['tcM5', 'tcM1', 'tcP1', 'tcP5'].forEach(id => { g(id).disabled = TCSEL.inf; });
    g('tcBox').classList.toggle('inf', TCSEL.inf);
    document.querySelectorAll('#quickPick button').forEach(b => b.classList.toggle('on', b.dataset.q === TCSEL.quick));
    g('qTime').textContent = TCSEL.inf ? '∞' : `${TCSEL.mins} мин`;
}
function tcStep(d) {
    TCSEL.mins = Math.max(1, Math.min(180, TCSEL.mins + d));
    saveTc(); renderTcBox();
}
[['tcM5', -5], ['tcM1', -1], ['tcP1', 1], ['tcP5', 5]].forEach(([id, d]) => document.getElementById(id).addEventListener('click', () => tcStep(d)));
document.getElementById('tcInf').addEventListener('change', e => { TCSEL.inf = e.target.checked; saveTc(); renderTcBox(); });
document.getElementById('quickPick').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    TCSEL.quick = b.dataset.q;
    saveTc(); renderTcBox();
});
// выбор времени запоминаем до того, как сработают обработчики создания комнаты и входа
document.getElementById('lobbyHost').addEventListener('click', () => { NET.pref = roomPref(); }, true);
document.getElementById('lobbyJoin').addEventListener('click', () => { NET.pref = 'any'; }, true);
renderTcBox();

// После соединения хозяин сообщает итоговое время. Если он искал «любое», берётся время гостя (оба «любое»: 30 минут)
function tcOnOpen() {
    const pref = NET.pref || 'any';
    if (NET.host) {
        if (pref !== 'any') { NET.tc = prefToTc(pref); netSend({ t: 'tc', tc: NET.tc }); }
        else NET.tc = undefined;
    } else netSend({ t: 'tcpref', pref });
    updateSetupTc();
}
const _netRecvTc = netRecv;
netRecv = function (m) {
    if (m && m.t === 'tcpref') {
        if (NET.host && (NET.pref || 'any') === 'any') { NET.tc = m.pref === 'any' ? 30 : prefToTc(m.pref); netSend({ t: 'tc', tc: NET.tc }); updateSetupTc(); }
        return;
    }
    if (m && m.t === 'tc') { if (!NET.host && typeof m.tc === 'number') { NET.tc = m.tc; updateSetupTc(); } return; }
    if (m && m.t === 'flag') { if (m.side === other(NET.me)) flagSide(m.side); return; }
    _netRecvTc(m);
};
function curTc() {
    if (NET.on) return typeof NET.tc === 'number' ? NET.tc : null;     // null: ещё не определено
    return TCSEL.inf ? 0 : TCSEL.mins;
}
function updateSetupTc() {
    const el = document.getElementById('setupTc');
    if (!el) return;
    const tc = curTc();
    el.classList.remove('hidden');
    el.textContent = tc === null ? 'Время партии: определится, когда подключится соперник.' : `Время партии: ${fmtTc(tc)}.`;
}
const _openSetupTc = openSetup;
openSetup = function () { _openSetupTc.apply(this, arguments); updateSetupTc(); };

// ---------- часы ----------
let CLOCK = { on: false, left: { w: 0, b: 0 }, last: 0, grace: 0 };
function fmtClock(sec) {
    sec = Math.max(0, Math.ceil(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), x = sec % 60;
    const p = n => String(n).padStart(2, '0');
    return h ? `${h}:${p(m)}:${p(x)}` : `${p(m)}:${p(x)}`;
}
function clockHTML(col) {
    if (!CLOCK.on) return '';
    return `<span class="clock" data-clock="${col}" data-notr>${fmtClock(CLOCK.left[col])}</span>`;
}
function initClock() {
    const tc = curTc() || 0;
    CLOCK = { on: tc > 0, left: { w: tc * 30, b: tc * 30 }, last: performance.now(), grace: 0 };
    if (G) render();
}
const _startGameTc = startGame;
startGame = function () { _startGameTc.apply(this, arguments); initClock(); };

function flagSide(side) {
    if (!G || G.over) return;
    CLOCK.left[side] = 0;
    G.over = { winner: other(side), title: 'Время вышло', text: `${colorName(other(side))} побеждают по времени.` };
    render(); showGameOver();
}
function paintClocks() {
    document.querySelectorAll('.clock[data-clock]').forEach(el => {
        const side = el.dataset.clock, t = CLOCK.left[side];
        const txt = fmtClock(t);
        if (el.textContent !== txt) el.textContent = txt;
        el.classList.toggle('running', !!G && !G.over && G.turn === side);
        el.classList.toggle('low', t < 30);
    });
}
setInterval(() => {
    const now = performance.now();
    const dt = (now - CLOCK.last) / 1000;
    CLOCK.last = now;
    if (!CLOCK.on || !G || G.over || document.getElementById('app').classList.contains('hidden')) return;
    const side = G.turn;
    CLOCK.left[side] = Math.max(0, CLOCK.left[side] - dt);
    paintClocks();
    if (CLOCK.left[side] > 0) { CLOCK.grace = 0; return; }
    if (!NET.on || side === NET.me) {                     // своё время вышло: сообщаем сопернику
        if (NET.on) netSend({ t: 'flag', side });
        flagSide(side);
    } else {                                              // время соперника: ждём его сообщения, иначе засчитываем сами
        if (!CLOCK.grace) CLOCK.grace = now + 5000;
        else if (now > CLOCK.grace) flagSide(side);
    }
}, 200);
const _renderClock = render;
render = function () { _renderClock.call(this); paintClocks(); };


// ===== Чат: на компьютере под правой рамкой героя, на телефоне внутри выезжающего меню =====
(function () {
    const g = id => document.getElementById(id);
    const chat = g('chat'), app = g('app'), log = g('log');
    if (!chat || !app || !log) return;
    const side = app.querySelector('.side-col'), logTitle = log.previousElementSibling;
    const mq = window.matchMedia('(max-width: 760px)');
    const place = () => {
        if (mq.matches) { if (chat.parentElement !== side) side.insertBefore(chat, logTitle); }
        else if (chat.parentElement !== app) app.insertBefore(chat, side);
    };
    if (mq.addEventListener) mq.addEventListener('change', place); else mq.addListener(place);
    place();
})();


// Внутри подбора целей и выбора клетки вражеская невидимка выглядит как свободная клетка
const _abilityCellsV = abilityCells;
abilityCells = function (key, col) {
    const prev = VIEWER;
    VIEWER = col;
    try { return JESTER_KEYS.includes(key) ? jesterCells(key, col) : _abilityCellsV.apply(this, arguments); } finally { VIEWER = prev; }
};
const _onModeCellV = onModeCell;
onModeCell = function () {
    const prev = VIEWER;
    VIEWER = G.turn;
    try { return _onModeCellV.apply(this, arguments); } finally { VIEWER = prev; }
};




// =====================================================================
//  ШУТ
// =====================================================================
// Предательством можно пользоваться только после определённого хода врага
const betrayReady = col => !!(G && G.done && (G.done[other(col)] || 0) >= CONFIG.betrayAfter);
const jesterSees = side => !!side && showTraps && (NET.on ? side === NET.me : side === G.turn);      // скрытые вещи Шута видит только он

// Фигура ходит как своя за Шута: на время подсчёта ходов её цвет подменяется
const asJester = (p, col, fn) => fn();      // предательской фигурой ходить нельзя: её можно только перевести на свою сторону
const _selectableMovesJ = selectableMoves;
selectableMoves = function (r, c) { return asJester(G.board[r][c], G.turn, () => _selectableMovesJ(r, c)); };

// Фигура в колпаке не рубит и не создаёт шахи
const _pseudoMovesJ = pseudoMoves;
pseudoMoves = function (b, r, c) {
    const mv = _pseudoMovesJ(b, r, c), p = b[r][c];
    if (!p || !(p.cap > 0)) return mv;
    return mv.filter(m => {
        if (m.ep) return false;
        const t = b[m.tr][m.tc];
        if (t && t.c !== p.c && !t.ghost) return false;
        return !givesCheck(b, m);
    });
};

const JESTER_KEYS = ['blunder', 'banana', 'jaws', 'tomato', 'pretense'];
function jesterCells(key, col) {
    const b = G.board, cells = [];
    if (key === 'blunder') {
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (p && p.c === col && !p.ghost && p.t !== 'k' && p.t !== 'j' && !(p.cap > 0)) cells.push([r, c]);
        }
    } else if (key === 'banana') {
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            if (isFreeCell(r, c) && !G.bananas.some(x => x.r === r && x.c === c) && !G.traps.some(x => x.r === r && x.c === c)) cells.push([r, c]);
        }
    } else if (key === 'jaws') {
        ownThree(col).forEach(r => {
            for (let c = 0; c < 8; c++) {
                if (!isEmptyCell(r, c)) continue;
                const nb = cloneBoard(b);
                nb[r][c] = { ...mk('j', col), moved: true };
                bananaSlideOnBoard(nb, r, c, col);      // поставленные на свою кожуру челюсти съедут: учитываем это
                if (safeAfter(nb, col)) cells.push([r, c]);
            }
        });
    } else if (key === 'tomato') {
        if (HEROES[G.hero[other(col)]].abilities.some(k => !(G.disabled[other(col)][k] > 0))) cells.push([0, 0]);      // цель выбирается кнопкой в панели врага
    } else if (key === 'pretense') {
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            const p = b[r][c];
            if (p && p.c !== col && !p.ghost && !p.invis && (p.t === 'b' || p.t === 'n') && !p.betray) cells.push([r, c]);
        }
    }
    return cells;
}

// Предательство: можно ли сейчас перевести фигуру на свою сторону (ход потратится, король не должен остаться под шахом)
function canBetray(col, r, c) {
    if (G.over || G.bonus || G.pairStep || G.pendingPromo || (G.forced && G.forced.length) || G.archUsed) return false;
    const p = G.board[r][c];
    if (!p || p.betray !== col || p.c === col || !betrayReady(col)) return false;
    const nb = cloneBoard(G.board);
    nb[r][c].c = col;
    return safeAfter(nb, col);
}

function doBetray(r, c) {
    const col = G.turn, p = G.board[r][c];
    if (!p || !canBetray(col, r, c)) { G.sel = null; G.moves = []; render(); return; }
    p.c = col; delete p.betray;
    G.fx.push({ r, c, type: 'hypno' });
    sfx('hypno');
    G.last = null; G.sel = null; G.moves = []; G.mode = null; G.ep = null;
    addLog(col, `🃏 Предательство: ${pieceSym(p)} ${sqName(r, c)} переходит на сторону Шута`);
    endTurn();
}

// Притворство: перед первым ходом Шут обязан тайно выбрать предателя
function startPretenseIfNeeded(c) {
    if (!G.pretense || G.pretense[c] !== 'pending') return;
    const cells = jesterCells('pretense', c);
    if (!cells.length) { G.pretense[c] = 'done'; return; }
    G.sel = null; G.moves = [];
    G.mode = { type: 'pretense', locked: true, cells };
}

function placeBanana(from, to) {
    const col = G.turn, cdKey = (G.mode && G.mode.via) || 'banana';
    G.bananas.push({ r: from[0], c: from[1], owner: col, dir: [to[0] - from[0], to[1] - from[1]] });
    G.cd[col][cdKey] = cdOf(col, cdKey);
    G.lastAb[col] = 'banana';
    sfx('trap');
    addLog(col, '🍌 Банановая кожура: ловушка установлена (место скрыто, ход не потрачен)');
    G.mode = null; G.sel = null; G.moves = [];
    render();
}

// Фигура (не король), вставшая на кожуру, съезжает на соседнюю клетку и кожура исчезает
function sweepBananas() {
    if (!G.bananas || !G.bananas.length) return;
    G.bananas = G.bananas.filter(bn => {
        const p = G.board[bn.r][bn.c];
        if (!p || p.t === 'k' || p.ghost) return true;
        if (p.warded > 0) {      // Очищение: фигура давит кожуру без последствий
            addLog('n', p.invis ? '✴ Невидимая фигура под Очищением уничтожает банановую кожуру' : `✴ ${pieceSym(p)} под Очищением уничтожает кожуру на ${sqName(bn.r, bn.c)}`);
            return false;
        }
        const tr = bn.r + bn.dir[0], tc = bn.c + bn.dir[1];
        const sq = sqName(bn.r, bn.c);
        sfx('trap');
        if (inb(tr, tc) && !G.board[tr][tc]) {
            G.board[tr][tc] = p;
            G.board[bn.r][bn.c] = null;
            p.prev = [bn.r, bn.c];
            if (!p.invis) G.fx.push({ r: tr, c: tc, type: 'land' });
            addLog('n', p.invis ? '🍌 Невидимая фигура поскальзывается на банановой кожуре' : `🍌 ${pieceSym(p)} поскальзывается на кожуре на ${sq} и съезжает на ${sqName(tr, tc)}`);
        } else {
            addLog('n', p.invis ? '🍌 Невидимая фигура наступает на банановую кожуру' : `🍌 ${pieceSym(p)} наступает на кожуру на ${sq}, но съехать некуда`);
        }
        return false;
    });
}

// Красная обструкция: способность врага отключена на несколько его ходов
function doTomato(k) {
    if (!G.mode || G.mode.type !== 'tomato') return;
    const col = G.turn, en = other(col);
    if (!HEROES[G.hero[en]].abilities.includes(k)) return;
    if (G.disabled[en][k] > 0) return;      // в уже отключённую способность помидор не бросить
    const cdKey = G.mode.via || 'tomato';
    G.disabled[en][k] = CONFIG.tomatoTurns;
    G.cd[col][cdKey] = cdOf(col, cdKey);
    G.lastAb[col] = 'tomato';
    sfx('cast');
    addLog(col, `🍅 Красная обструкция: способность «${ABILITIES[k].name}» врага отключена на ${CONFIG.tomatoTurns} ${plural(CONFIG.tomatoTurns)} (ход не потрачен)`);
    G.mode = null; G.sel = null; G.moves = [];
    render();      // ход не тратится
}

// Своя модель челюстей: pieces/jaws.png
(function () {
    if (typeof Image === 'undefined') return;
    const im = new Image();
    im.onload = () => { document.documentElement.style.setProperty('--img-jaws', 'url("pieces/jaws.png")'); if (document.body) document.body.classList.add('img-jaws'); };
    im.src = 'pieces/jaws.png';
})();


/* =====================================================================
   АККАУНТЫ (Supabase): вход через Google или почту + ник.
   Ключ ниже публичный (publishable), его можно хранить в коде.
   ===================================================================== */
const SUPA_URL = 'https://fuqopbjpxeugdvnlxanb.supabase.co';
const SUPA_KEY = 'sb_publishable_xVvPSDswx_P2D-kguqgznQ_5cjBAcMN';
let SB = null;
try { if (window.supabase && window.supabase.createClient) SB = window.supabase.createClient(SUPA_URL, SUPA_KEY); } catch (e) { SB = null; }
const ACC = { user: null, nick: '' };
let authMode = 'login';   // login | signup | nick
const NICK_RE = /^[\p{L}\p{N}_\- ]{3,16}$/u;
const authMsg = t => { $('#authMsg').textContent = t || ''; };

function accRefresh() {
    const u = ACC.user;
    ACC.nick = u && u.user_metadata && u.user_metadata.nick ? String(u.user_metadata.nick) : '';
    const nm = $('#accName');
    nm.textContent = u ? '👤 ' + (ACC.nick || (u.email || '').split('@')[0]) : '';
    nm.classList.toggle('hidden', !u);
    $('#accBtn').classList.toggle('hidden', !!u);
    $('#accOut').classList.toggle('hidden', !u);
    if (u && !ACC.nick && $('#auth').classList.contains('hidden')) openAuth('nick');
}

function openAuth(mode) {
    authMode = mode;
    const nick = mode === 'nick', signup = mode === 'signup';
    $('#authTitle').textContent = nick ? 'Как вас называть?' : signup ? 'Регистрация' : 'Вход';
    $('#authGoogleBox').classList.toggle('hidden', nick);
    $('#authEmail').classList.toggle('hidden', nick);
    $('#authPass').classList.toggle('hidden', nick);
    $('#authNick').classList.toggle('hidden', !(nick || signup));
    $('#authPass').autocomplete = signup ? 'new-password' : 'current-password';
    $('#authSubmit').textContent = nick ? 'Сохранить ник' : signup ? 'Регистрация' : 'Войти';
    $('#authSwitch').classList.toggle('hidden', nick);
    $('#authSwitch').textContent = signup ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Регистрация';
    $('#authClose').classList.toggle('hidden', false);
    authMsg('');
    $('#auth').classList.remove('hidden');
}

function authError(err) {
    const m = String((err && err.message) || '');
    if (/invalid login/i.test(m)) return 'Неверная почта или пароль.';
    if (/already registered|already been registered/i.test(m)) return 'Эта почта уже зарегистрирована. Нажмите «Войти».';
    if (/not confirmed/i.test(m)) return 'Подтвердите почту по ссылке из письма, затем войдите.';
    if (/rate limit|too many/i.test(m)) return 'Слишком много попыток, подождите немного.';
    if (/at least 6/i.test(m)) return 'Пароль должен быть не короче 6 символов.';
    return m || 'Не удалось выполнить вход. Попробуйте ещё раз.';
}

async function authSubmit() {
    if (!SB) { authMsg('Не загрузилась библиотека входа: проверьте интернет и обновите страницу.'); return; }
    const btn = $('#authSubmit');
    btn.disabled = true;
    try {
        if (authMode === 'nick') {
            const nick = $('#authNick').value.trim();
            if (!NICK_RE.test(nick)) { authMsg('Ник: 3–16 символов, буквы, цифры, пробел, _ и -.'); return; }
            const { data, error } = await SB.auth.updateUser({ data: { nick } });
            if (error) { authMsg(authError(error)); return; }
            ACC.user = data.user; accRefresh();
            $('#auth').classList.add('hidden');
            return;
        }
        const email = $('#authEmail').value.trim(), pass = $('#authPass').value;
        if (!email || !pass) { authMsg('Введите почту и пароль.'); return; }
        if (authMode === 'signup') {
            const nick = $('#authNick').value.trim();
            if (!NICK_RE.test(nick)) { authMsg('Ник: 3–16 символов, буквы, цифры, пробел, _ и -.'); return; }
            if (pass.length < 6) { authMsg('Пароль должен быть не короче 6 символов.'); return; }
            const { data, error } = await SB.auth.signUp({ email, password: pass, options: { data: { nick }, emailRedirectTo: location.origin + location.pathname } });
            if (error) { authMsg(authError(error)); return; }
            if (data.session) { ACC.user = data.user; accRefresh(); $('#auth').classList.add('hidden'); }
            else authMsg('Письмо отправлено. Подтвердите почту по ссылке в письме и затем войдите.');
            return;
        }
        const { data, error } = await SB.auth.signInWithPassword({ email, password: pass });
        if (error) { authMsg(authError(error)); return; }
        ACC.user = data.user; accRefresh();
        $('#auth').classList.add('hidden');
    } catch (e) { authMsg('Не удалось выполнить вход. Попробуйте ещё раз.'); }
    finally { btn.disabled = false; }
}

$('#accBtn').addEventListener('click', () => {
    if (!SB) { uiAlert('Не загрузилась библиотека входа: проверьте интернет и обновите страницу.'); return; }
    openAuth('login');
});
$('#accOut').addEventListener('click', async () => { if (SB) { try { await SB.auth.signOut(); } catch (e) { /* выйдем и так */ } } ACC.user = null; accRefresh(); });
$('#authSubmit').addEventListener('click', authSubmit);
$('#authSwitch').addEventListener('click', () => openAuth(authMode === 'login' ? 'signup' : 'login'));
$('#authClose').addEventListener('click', () => $('#auth').classList.add('hidden'));
['authEmail', 'authPass', 'authNick'].forEach(id => $('#' + id).addEventListener('keydown', e => { if (e.key === 'Enter') authSubmit(); }));
$('#authGoogle').addEventListener('click', async () => {
    if (!SB) { authMsg('Не загрузилась библиотека входа: проверьте интернет и обновите страницу.'); return; }
    const { error } = await SB.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
    if (error) authMsg(authError(error));
});

if (SB) {
    SB.auth.getSession().then(({ data }) => { ACC.user = data && data.session ? data.session.user : null; accRefresh(); }).catch(() => { });
    SB.auth.onAuthStateChange((ev, session) => { ACC.user = session ? session.user : null; accRefresh(); });
}