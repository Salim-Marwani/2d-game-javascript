const gameArea = document.getElementById("gameArea");
const player = document.getElementById("player");
const scoreText = document.getElementById("scoreText");
const livesText = document.getElementById("livesText");
const bestText = document.getElementById("bestScoreText");

let score = 0;
let lives = 3;
let bestScore = Number(localStorage.getItem("bestScore")) || 0;
let playerX = (gameArea.offsetWidth / 2) - 27;
player.style.left = playerX + "px";

let playerSpeed = 5;
const keys = { left: false, right: false };

let objects = [];
let particles = [];
let floats = [];
let difficulty = 1;
const spawnIntervalMs = 1200;
let spawnIntervalId = null;

let soundBonus=null, soundMalus=null, soundLife=null, soundGameOver=null;
try {
    soundBonus = new Audio('assets/bonus.wav');
    soundMalus = new Audio('assets/malus.wav');
    soundLife  = new Audio('assets/life.wav');
    soundGameOver = new Audio('assets/gameover.wav');
} catch(e){}

scoreText.textContent = `Score: ${score}`;
livesText.textContent = `Lives: ${lives}`;
bestText.textContent = `Best: ${bestScore}`;


document.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") keys.left = true;
    if (e.key === "ArrowRight") keys.right = true;
});
document.addEventListener("keyup", e => {
    if (e.key === "ArrowLeft") keys.left = false;
    if (e.key === "ArrowRight") keys.right = false;
});


window.addEventListener("resize", () => {
    const maxRight = gameArea.offsetWidth - player.offsetWidth;
    if (playerX > maxRight) { playerX = maxRight; player.style.left = playerX + "px"; }
});

setInterval(() => {
    difficulty += 0.35;
    playerSpeed = Math.min(9, playerSpeed + 0.25);
}, 45000);

/* Spawning */
function spawnObject() {
    const size = 48;
    const obj = document.createElement('div');

    const r = Math.random();
    if (r < 0.60) { obj.classList.add('bonus'); obj.type = 'bonus'; }
    else if (r < 0.95) { obj.classList.add('malus'); obj.type = 'malus'; }
    else { obj.classList.add('life'); obj.type = 'life'; }

    obj.style.width = size + 'px';
    obj.style.height = size + 'px';

    const gameRect = gameArea.getBoundingClientRect();
    const x = Math.random() * Math.max(1, (gameRect.width - size));
    obj.style.left = x + 'px';
    obj.style.top = '-10px';

    obj.y = -10;
    obj.speed = (2 + Math.random() * 2) * difficulty;

    gameArea.appendChild(obj);
    objects.push(obj);
}
spawnIntervalId = setInterval(spawnObject, spawnIntervalMs);

/* collision helper */
function isColliding(a, b) {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return !(ra.right < rb.left || ra.left > rb.right || ra.bottom < rb.top || ra.top > rb.bottom);
}

/* float helper */
function spawnFloatingText(x, y, text, cssClass='float-bonus') {
    // ensure coordinates are numbers
    const gx = Number(x) || 0;
    const gy = Number(y) || 0;
    const el = document.createElement('div');
    el.className = 'floatingText ' + cssClass;
    el.textContent = text;
    // position relative to gameArea
    el.style.left = gx + 'px';
    el.style.top = gy + 'px';
    gameArea.appendChild(el);
    floats.push({el, life: 800});
}

/* particle helper */
function spawnParticles(x, y, color='#ffd', count=8) {
    for (let i=0;i<count;i++){
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        p.style.background = color;
        p.style.opacity = 1;
        gameArea.appendChild(p);
        const angle = (Math.random() * Math.PI) - (Math.PI/2);
        const speed = 0.6 + Math.random()*1.2;
        particles.push({el:p, x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed - 1.0, life: 900 + Math.random()*400});
    }
}

function flash(type) {
    const el = gameArea.querySelector('.flash.' + type);
    if (!el) return;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    setTimeout(() => {
        el.classList.remove('show');
    }, 200);
}

function shake(duration=260) {
    gameArea.classList.remove('shake');
    void gameArea.offsetWidth;
    gameArea.classList.add('shake');
    setTimeout(()=>gameArea.classList.remove('shake'), duration);
}

/* gameOver */
function gameOver(){
    clearInterval(spawnIntervalId);
    if (score > bestScore) { bestScore = score; localStorage.setItem('bestScore', bestScore); }
    document.getElementById('finalScore').textContent = `Final Score: ${score}`;
    document.getElementById('finalBest').textContent = `Best Score: ${bestScore}`;
    try { new bootstrap.Modal(document.getElementById('gameOverModal')).show(); } catch(e){}
    if (soundGameOver) try { soundGameOver.play(); } catch(e){}
}

/* main loop */
function update() {
    // movement
    if (keys.left) { playerX -= playerSpeed; if (playerX < 0) playerX = 0; }
    if (keys.right) { const maxRight = gameArea.offsetWidth - player.offsetWidth; playerX += playerSpeed; if (playerX > maxRight) playerX = maxRight; }
    player.style.left = playerX + 'px';

    // objects
    for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        obj.y += obj.speed;
        obj.style.top = obj.y + 'px';

        if (isColliding(obj, player)) {
            const rect = player.getBoundingClientRect();
            const gameRect = gameArea.getBoundingClientRect();
            const cx = rect.left + rect.width/2 - gameRect.left;
            const cy = rect.top + rect.height/2 - gameRect.top;

            if (obj.type === 'bonus') {
                score += 10;
                scoreText.textContent = `Score: ${score}`;
                spawnFloatingText(cx, cy - 20, '+10', 'float-bonus');
                spawnParticles(cx, cy, '#fff9c8', 10);
                flash('bonus');
                if (soundBonus) try{ soundBonus.currentTime = 0; soundBonus.play(); }catch(e){}
            } else if (obj.type === 'malus') {
                lives -= 1;
                livesText.textContent = `Lives: ${lives}`;
                spawnFloatingText(cx, cy - 10, '-1 Life', 'float-damage');
                spawnParticles(cx, cy, '#ffb3b3', 10);
                flash('damage');
                shake(260);
                if (soundMalus) try{ soundMalus.currentTime = 0; soundMalus.play(); }catch(e){}
            } else if (obj.type === 'life' && lives < 6) {
                lives += 1;
                livesText.textContent = `Lives: ${lives}`;
                spawnFloatingText(cx, cy - 20, '+1 Life', 'float-life');
                spawnParticles(cx, cy, '#ffd79a', 12);
                flash('life');
                if (soundLife) try{ soundLife.currentTime = 0; soundLife.play(); }catch(e){}
            }

            obj.remove();
            objects.splice(i,1);
            continue;
        }

        if (obj.y > gameArea.offsetHeight + 40) {
            obj.remove();
            objects.splice(i,1);
        }
    }

    // particles update
    for (let i = particles.length-1; i>=0; i--) {
        const p = particles[i];
        p.life -= 16;
        if (p.life <= 0) { p.el.remove(); particles.splice(i,1); continue; }
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06;
        p.el.style.left = p.x + 'px';
        p.el.style.top  = p.y + 'px';
        p.el.style.opacity = Math.max(0, p.life/1200);
    }

    // floats update
    for (let i = floats.length-1; i>=0; i--) {
        const f = floats[i];
        f.life -= 16;
        const progress = 1 - (f.life / 800);
        f.el.style.transform = `translateY(${-progress*36}px) scale(${1 - progress*0.12})`;
        f.el.style.opacity = Math.max(0, 1 - progress);
        if (f.life <= 0) { f.el.remove(); floats.splice(i,1); }
    }

    // game over check
    if (lives <= 0) { gameOver(); return; }

    requestAnimationFrame(update);
}

/* start */
requestAnimationFrame(update);

/* restart */
const restartBtn = document.getElementById('restartBtn');
if (restartBtn) restartBtn.addEventListener('click', () => location.reload());
