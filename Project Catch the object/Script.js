// get game UI elements
const gameArea = document.getElementById("gameArea");
const player = document.getElementById("player");
const scoreText = document.getElementById("scoreText");
const livesText = document.getElementById("livesText");
const bestText = document.getElementById("bestScoreText");

// start and restart elements
const startScreen = document.getElementById("startScreen");
const startBtn = document.getElementById("startBtn");
const startBest = document.getElementById("startBest");
const gameOverModal = document.getElementById("gameOverModal");
const restartBtn = document.getElementById("restartBtn");
const finalScore = document.getElementById("finalScore");
const finalBest = document.getElementById("finalBest");

// main game values
let score = 0;
let lives = 3;
const MAX_LIVES = 3;

// load best score
let bestScore = Number(localStorage.getItem("bestScore")) || 0;

// put player in the center
let playerX = (gameArea.offsetWidth / 2) - (player.offsetWidth / 2);
player.style.left = playerX + "px";

// speed + difficulty
let playerSpeed = 5;
let difficulty = 1;
const baseSpawnIntervalMs = 1200;

// lists for objects/effects
let objects = [];
let particles = [];
let floats = [];

let running = false;         // game is active?
let spawnIntervalId = null;  // spawner id

// update the HUD
scoreText.textContent = "Score: 0";
livesText.textContent = "Lives: 3";
bestText.textContent = "Best: " + bestScore;
startBest.textContent = bestScore;

// movement keys
const keys = { left: false, right: false };

// key down → store movement
document.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") keys.left = true;
    if (e.key === "ArrowRight") keys.right = true;

    // allow Enter to start
    if (!running && e.key === "Enter") startGame();
});

// key up → stop movement
document.addEventListener("keyup", e => {
    if (e.key === "ArrowLeft") keys.left = false;
    if (e.key === "ArrowRight") keys.right = false;
});

// increase difficulty over time
setInterval(() => {
    if (!running) return;

    difficulty += 0.35;          // objects fall faster
    playerSpeed = Math.min(9, playerSpeed + 0.25); // faster movement
}, 45000);

// create one falling object
function spawnObject() {

    const obj = document.createElement("div");
    const r = Math.random();  // pick object type

    // 60% bonus
    if (r < 0.60) {
        obj.classList.add("bonus");
        obj.type = "bonus";
    }
    // 35% malus
    else if (r < 0.95) {
        obj.classList.add("malus");
        obj.type = "malus";
    }
    // 5% life
    else {
        obj.classList.add("life");
        obj.type = "life";
    }

    // spawn above top
    obj.y = -10;
    obj.style.top = "-10px";

    // pick random x pos
    obj.style.left = Math.random() * (gameArea.offsetWidth - 48) + "px";

    // falling speed
    obj.speed = (2 + Math.random() * 2) * difficulty;

    // add to game
    gameArea.appendChild(obj);
    objects.push(obj);
}

// floating text like +10 or -10
function spawnFloatingText(x, y, text) {
    const el = document.createElement("div");
    el.className = "floatingText";
    el.textContent = text;
    el.style.left = x + "px";
    el.style.top = y + "px";

    gameArea.appendChild(el);

    floats.push({ el, life: 800 }); // lasts 800ms
}

// particles around hits
function spawnParticles(x, y, color = "#fff", count = 8) {
    for (let i = 0; i < count; i++) {

        const p = document.createElement("div");
        p.className = "particle";
        p.style.background = color;

        p.x = x;
        p.y = y;

        const angle = Math.random() * Math.PI - Math.PI/2; // random direction
        const speed = 1 + Math.random();

        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed - 1;

        p.life = 900; // ms

        gameArea.appendChild(p);
        particles.push(p);
    }
}

// simple collision box check
function isColliding(a, b) {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();

    return !(ra.right < rb.left || ra.left > rb.right || ra.bottom < rb.top || ra.top > rb.bottom);
}

// end of game → show modal
function gameOver() {

    clearInterval(spawnIntervalId);
    running = false;

    // save best score
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem("bestScore", bestScore);
    }

    // update modal text
    finalScore.textContent = "Final Score: " + score;
    finalBest.textContent = "Best Score: " + bestScore;
    startBest.textContent = bestScore;

    // show modal
    const modal = new bootstrap.Modal(gameOverModal);
    modal.show();

    // restart button inside modal
    restartBtn.onclick = () => {
        bootstrap.Modal.getInstance(gameOverModal).hide();
        startScreen.style.display = "flex";
    };
}

// main game loop (runs every frame)
function update() {
    if (!running) return;

    // move left/right
    if (keys.left) playerX -= playerSpeed;
    if (keys.right) playerX += playerSpeed;

    // keep player inside screen
    const maxRight = gameArea.offsetWidth - player.offsetWidth;
    if (playerX < 0) playerX = 0;
    if (playerX > maxRight) playerX = maxRight;

    player.style.left = playerX + "px";

    // update falling objects
    for (let i = objects.length - 1; i >= 0; i--) {

        const obj = objects[i];

        obj.y += obj.speed;             // fall down
        obj.style.top = obj.y + "px";

        // check collision with player
        if (isColliding(obj, player)) {

            const rect = player.getBoundingClientRect();
            const gameRect = gameArea.getBoundingClientRect();
            const cx = rect.left + rect.width/2 - gameRect.left;
            const cy = rect.top + rect.height/2 - gameRect.top;

            // bonus hit
            if (obj.type === "bonus") {
                score += 10;
                scoreText.textContent = "Score: " + score;
                spawnFloatingText(cx, cy, "+10");
                spawnParticles(cx, cy, "#fff9c8");
            }
            // malus hit
            else if (obj.type === "malus") {
                lives -= 1;
                livesText.textContent = "Lives: " + lives;
                spawnFloatingText(cx, cy, "-1 Life");
                spawnParticles(cx, cy, "#ffb3b3");
            }
            // life pickup
            else if (obj.type === "life") {
                if (lives < MAX_LIVES) {
                    lives += 1;
                    livesText.textContent = "Lives: " + lives;
                    spawnFloatingText(cx, cy, "+1 Life");
                    spawnParticles(cx, cy, "#ffd79a");
                }
            }

            obj.remove();
            objects.splice(i, 1);
            continue;
        }

        // object hits the floor
        if (obj.y > gameArea.offsetHeight + 40) {

            // bonus falling → lose points
            if (obj.type === "bonus") {
                score -= 10;
                if (score < 0) score = 0;
                scoreText.textContent = "Score: " + score;

                spawnFloatingText(obj.offsetLeft, gameArea.offsetHeight - 40, "-10");
                spawnParticles(obj.offsetLeft, gameArea.offsetHeight - 40, "#ffb3b3");
            }

            obj.remove();
            objects.splice(i, 1);
        }
    }

    // update particles
    for (let i = particles.length - 1; i >= 0; i--) {

        const p = particles[i];
        p.life -= 16;

        if (p.life <= 0) {
            p.remove();
            particles.splice(i, 1);
            continue;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // gravity-ish

        p.style.left = p.x + "px";
        p.style.top = p.y + "px";
        p.style.opacity = Math.max(0, p.life / 900);
    }

    // update floating text
    for (let i = floats.length - 1; i >= 0; i--) {

        const f = floats[i];
        f.life -= 16;

        const t = 1 - f.life / 800;

        f.el.style.transform = `translateY(${-t * 40}px)`;
        f.el.style.opacity = 1 - t;

        if (f.life <= 0) {
            f.el.remove();
            floats.splice(i, 1);
        }
    }

    // end game
    if (lives <= 0) {
        gameOver();
        return;
    }

    requestAnimationFrame(update);
}

// start the game
function startGame() {

    score = 0;
    lives = MAX_LIVES;
    difficulty = 1;
    playerSpeed = 5;

    scoreText.textContent = "Score: 0";
    livesText.textContent = "Lives: " + lives;
    bestText.textContent = "Best: " + bestScore;

    // clean old stuff
    objects.forEach(o => o.remove());
    particles.forEach(p => p.remove());
    floats.forEach(f => f.el.remove());
    objects = [];
    particles = [];
    floats = [];

    // reset player pos
    playerX = (gameArea.offsetWidth / 2) - (player.offsetWidth / 2);
    player.style.left = playerX + "px";

    // get selected difficulty
    const diff = document.querySelector("input[name=difficulty]:checked").value;

    let spawnMs = baseSpawnIntervalMs;
    if (diff === "easy") spawnMs *= 1.3;
    if (diff === "hard") spawnMs *= 0.75;

    clearInterval(spawnIntervalId);
    spawnIntervalId = setInterval(spawnObject, spawnMs);

    startScreen.style.display = "none";
    running = true;

    requestAnimationFrame(update);
}

// click start
startBtn.addEventListener("click", startGame);
