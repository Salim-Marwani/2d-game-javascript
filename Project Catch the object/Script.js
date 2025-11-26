const gameArea = document.getElementById("gameArea");
const player = document.getElementById("player");
const scoreText = document.getElementById("scoreText");
const livesText = document.getElementById("livesText");
const bestText = document.getElementById("bestScoreText");

/* State */
let score = 0;
let lives = 3;
let bestScore = Number(localStorage.getItem("bestScore")) || 0;
let playerX = (gameArea.offsetWidth / 2) - 27;
player.style.left = playerX + "px";

let playerSpeed = 5;
let difficulty = 1;

let objects = [];
let particles = [];
let floats = [];

let running = false;
let spawnIntervalId = null;
const baseSpawnIntervalMs = 1200;

/* HUD Init */
scoreText.textContent = `Score: ${score}`;
livesText.textContent = `Lives: ${lives}`;
bestText.textContent = `Best: ${bestScore}`;
document.getElementById("startBest").textContent = bestScore;

/* Controls */
const keys = { left: false, right: false };
document.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") keys.left = true;
    if (e.key === "ArrowRight") keys.right = true;
    if (!running && e.key === "Enter") startGame();
});
document.addEventListener("keyup", e => {
    if (e.key === "ArrowLeft") keys.left = false;
    if (e.key === "ArrowRight") keys.right = false;
});

/* Auto difficulty increase */
setInterval(() => {
    difficulty += 0.35;
    playerSpeed = Math.min(9, playerSpeed + 0.25);
}, 45000);

/* Spawn Objects */
function spawnObject() {
    const size = 48;
    const obj = document.createElement('div');

    const r = Math.random();
    if (r < 0.60) { obj.classList.add('bonus'); obj.type = 'bonus'; }
    else if (r < 0.95) { obj.classList.add('malus'); obj.type = 'malus'; }
    else { obj.classList.add('life'); obj.type = 'life'; }

    const x = Math.random() * (gameArea.offsetWidth - size);
    obj.style.left = x + "px";
    obj.style.top = "-10px";
    obj.y = -10;
    obj.speed = (2 + Math.random()*2) * difficulty;

    gameArea.appendChild(obj);
    objects.push(obj);
}

/* Floating texts */
function spawnFloatingText(x, y, text) {
    const el = document.createElement('div');
    el.className = 'floatingText';
    el.textContent = text;
    el.style.left = x + "px";
    el.style.top = y + "px";
    gameArea.appendChild(el);
    floats.push({el, life: 800});
}

/* Particles */
function spawnParticles(x, y, color='#fff', count=8) {
    for (let i=0; i<count; i++){
        const p = document.createElement("div");
        p.className = "particle";
        p.style.background = color;
        p.x = x;
        p.y = y;
        const angle = Math.random() * Math.PI - Math.PI/2;
        const speed = 1 + Math.random();
        p.vx = Math.cos(angle)*speed;
        p.vy = Math.sin(angle)*speed - 1;
        p.life = 900;
        gameArea.appendChild(p);
        particles.push(p);
    }
}

/* Flash */
function flash(type){
    const el = document.querySelector(".flash." + type);
    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");
}

/* Collision */
function isColliding(a,b){
    const ra=a.getBoundingClientRect();
    const rb=b.getBoundingClientRect();
    return !(ra.right < rb.left || ra.left > rb.right || ra.bottom < rb.top || ra.top > rb.bottom);
}

/* Game Over */
function gameOver(){
    clearInterval(spawnIntervalId);
    running = false;

    if (score > bestScore){
        bestScore = score;
        localStorage.setItem("bestScore", bestScore);
    }

    document.getElementById("finalScore").textContent = "Final Score: " + score;
    document.getElementById("finalBest").textContent = "Best Score: " + bestScore;

    const sb = document.getElementById("startBest");
    sb.textContent = bestScore;

    new bootstrap.Modal(document.getElementById("gameOverModal")).show();

    document.getElementById("restartBtn").onclick = () => {
        bootstrap.Modal.getInstance(document.getElementById("gameOverModal")).hide();
        document.getElementById("startScreen").style.display = "flex";
    };
}

/* Main Loop */
function update(){
    if (!running) return;

    if (keys.left) playerX -= playerSpeed;
    if (keys.right) playerX += playerSpeed;
    const maxRight = gameArea.offsetWidth - player.offsetWidth;
    if (playerX < 0) playerX = 0;
    if (playerX > maxRight) playerX = maxRight;
    player.style.left = playerX + "px";

    /* Update Objects */
    for (let i=objects.length-1; i>=0; i--){
        const obj = objects[i];
        obj.y += obj.speed;
        obj.style.top = obj.y + "px";

        if (isColliding(obj,player)){
            const rect = player.getBoundingClientRect();
            const gameRect = gameArea.getBoundingClientRect();
            const cx = rect.left + rect.width/2 - gameRect.left;
            const cy = rect.top + rect.height/2 - gameRect.top;

            if (obj.type === "bonus"){
                score += 10;
                scoreText.textContent = "Score: " + score;
                spawnFloatingText(cx, cy, "+10");
                spawnParticles(cx, cy, "#fff9c8");
                flash("bonus");
            }
            else if (obj.type === "malus"){
                lives -= 1;
                livesText.textContent = "Lives: " + lives;
                spawnFloatingText(cx, cy, "-1 Life");
                spawnParticles(cx, cy, "#ffb3b3");
                flash("damage");
            }
            else if (obj.type === "life" && lives < 6){
                lives += 1;
                livesText.textContent = "Lives: " + lives;
                spawnFloatingText(cx, cy, "+1 Life");
                spawnParticles(cx, cy, "#ffd79a");
                flash("life");
            }

            obj.remove();
            objects.splice(i,1);
            continue;
        }

        if (obj.y > gameArea.offsetHeight + 40){
            obj.remove();
            objects.splice(i,1);
        }
    }

    /* Update Particles */
    for (let i=particles.length-1; i>=0; i--){
        const p = particles[i];
        p.life -= 16;
        if (p.life <= 0){
            p.remove();
            particles.splice(i,1);
            continue;
        }
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.style.left = p.x + "px";
        p.style.top = p.y + "px";
        p.style.opacity = Math.max(0, p.life/900);
    }

    /* Update Floating Text */
    for (let i=floats.length-1; i>=0; i--){
        const f = floats[i];
        f.life -= 16;
        const t = 1 - f.life/800;
        f.el.style.transform = `translateY(${-t*40}px)`;
        f.el.style.opacity = 1 - t;
        if (f.life <= 0){
            f.el.remove();
            floats.splice(i,1);
        }
    }

    if (lives <= 0){
        gameOver();
        return;
    }

    requestAnimationFrame(update);
}

/* Start Game */
function startGame(){
    score = 0;
    lives = 3;
    difficulty = 1;
    playerSpeed = 5;

    scoreText.textContent = "Score: 0";
    livesText.textContent = "Lives: 3";
    bestText.textContent = "Best: " + bestScore;

    objects.forEach(o => o.remove());
    objects = [];

    const diff = document.querySelector("input[name=difficulty]:checked").value;
    let spawnMs = baseSpawnIntervalMs;
    if (diff === "easy") spawnMs *= 1.3;
    if (diff === "hard") spawnMs *= 0.75;

    clearInterval(spawnIntervalId);
    spawnIntervalId = setInterval(spawnObject, spawnMs);

    document.getElementById("startScreen").style.display = "none";

    running = true;
    requestAnimationFrame(update);
}

document.getElementById("startBtn").addEventListener("click", startGame);
