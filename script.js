// Pixel Sky Dodger - 스프라이트 버전
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ========================
//   스프라이트 로드
// ========================
const SPRITES = {};
const SPRITE_LIST = ['airplane','character','coin','creature','explosion','flag','lightning','magnet'];
let loadedCount = 0;

SPRITE_LIST.forEach(name => {
  const img = new Image();
  img.src = `sprites/${name}.png`;
  img.onload = () => { loadedCount++; };
  SPRITES[name] = img;
});

function spritesReady() { return loadedCount >= SPRITE_LIST.length; }

// ========================
//   게임 상태
// ========================
let gameState = 'title';
let score = 0;
let coins = 0;
let stage = 1;
let avoids = 0;
let highScore = parseInt(localStorage.getItem('pixelSkyHighScore') || '0');
let totalCoins = parseInt(localStorage.getItem('pixelSkyTotalCoins') || '0');

const player = {
  x: 175, y: 450,
  width: 50, height: 38,
  speed: 5,
  shield: false,
  shieldTimer: 0
};

let keys = {};
let touchActive = false, touchX = 0;
let magnetActive = false, magnetTimer = 0;

let enemies = [], stars = [], coinItems = [], hammers = [], magnets = [];
let birds = [], lightnings = [], clouds = [], explosions = [];

for (let i = 0; i < 10; i++) {
  clouds.push({
    x: Math.random() * 500 - 50,
    y: Math.random() * 250,
    size: 30 + Math.random() * 40,
    speed: 0.3 + Math.random() * 0.4
  });
}

// ========================
//   그리기 헬퍼
// ========================
function drawSprite(name, x, y, w, h) {
  const img = SPRITES[name];
  if (img && img.complete) ctx.drawImage(img, x, y, w, h);
}

function drawCloud(c) {
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#ecf0f1';
  ctx.beginPath();
  ctx.arc(c.x + c.size * 0.5,  c.y,              c.size * 0.55, 0, Math.PI * 2);
  ctx.arc(c.x + c.size * 1.1,  c.y - c.size*0.2, c.size * 0.7,  0, Math.PI * 2);
  ctx.arc(c.x + c.size * 0.1,  c.y + c.size*0.1, c.size * 0.6,  0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ========================
//   업데이트
// ========================
function updateGame() {
  let dx = 0, dy = 0;
  if (keys['ArrowLeft']  || keys['a']) dx -= player.speed;
  if (keys['ArrowRight'] || keys['d']) dx += player.speed;
  if (keys['ArrowUp']    || keys['w']) dy -= player.speed;
  if (keys['ArrowDown']  || keys['s']) dy += player.speed;
  if (touchActive) dx += (touchX - (player.x + player.width / 2)) * 0.18;

  player.x = Math.max(0, Math.min(canvas.width  - player.width,  player.x + dx));
  player.y = Math.max(40, Math.min(canvas.height - player.height - 20, player.y + dy));

  if (stage >= 4) player.y += Math.sin(Date.now() * 0.008) * 1.2;

  // 자석: 코인 끌어당기기
  if (magnetActive) {
    coinItems.forEach(c => {
      const cx = c.x + 10, cy = c.y + 10;
      const px = player.x + player.width/2, py = player.y + player.height/2;
      const dist = Math.hypot(px-cx, py-cy);
      if (dist < 180) { c.x += (px-cx)*0.08; c.y += (cy > py ? -1 : 1)*0.08 + (py-cy)*0.08; }
    });
  }

  const spawnRate = 0.015 + stage * 0.0035;

  // 스폰
  if (Math.random() < spawnRate) {
    const fromLeft = Math.random() < 0.5;
    enemies.push({
      x: fromLeft ? -50 : canvas.width + 10,
      y: 60 + Math.random() * canvas.height * 0.35,
      speed: 1.8 + stage * 0.4,
      dir: fromLeft ? 1 : -1
    });
  }
  if (Math.random() < spawnRate * 0.7)
    birds.push({ x: Math.random() * (canvas.width - 36), y: -36, speed: 2.2 + stage * 0.25 });
  if (stage >= 5 && Math.random() < 0.008 + stage * 0.001)
    lightnings.push({ x: Math.random() * (canvas.width - 30), y: -60, speed: 5 + stage * 0.5 });
  if (Math.random() < 0.012)
    stars.push({ x: Math.random() * (canvas.width - 24), y: -24, speed: 2.5 });
  if (Math.random() < 0.008)
    coinItems.push({ x: Math.random() * (canvas.width - 24), y: -24, speed: 2 });
  if (Math.random() < 0.004)
    hammers.push({ x: Math.random() * (canvas.width - 24), y: -24, speed: 1.8 });
  if (Math.random() < 0.003)
    magnets.push({ x: Math.random() * (canvas.width - 24), y: -24, speed: 1.8 });

  // 적 전투기
  enemies = enemies.filter(e => {
    e.x += e.speed * e.dir;
    if (e.x < -60 || e.x > canvas.width + 60) { avoids++; return false; }
    if (hit(player, e.x, e.y, 50, 38)) {
      if (player.shield) { player.shield = false; player.shieldTimer = 0; score += 100; }
      else { triggerGameOver(); }
      return false;
    }
    return true;
  });

  // 새
  birds = birds.filter(b => {
    b.y += b.speed;
    if (hit(player, b.x, b.y, 36, 28)) { score = Math.max(0, score - 30); return false; }
    return b.y < canvas.height + 50;
  });

  // 번개
  lightnings = lightnings.filter(l => {
    l.y += l.speed;
    if (hit(player, l.x, l.y, 30, 60)) { triggerGameOver(); return false; }
    return l.y < canvas.height + 100;
  });

  // 아이템 수집
  stars = collectItem(stars, 'star');
  coinItems = collectItem(coinItems, 'coin');
  hammers = collectItem(hammers, 'hammer');
  magnets = collectItem(magnets, 'magnet');

  // 폭발 애니메이션 업데이트
  explosions = explosions.filter(e => { e.t--; return e.t > 0; });

  // 보호막 타이머
  if (player.shieldTimer > 0 && --player.shieldTimer <= 0) player.shield = false;
  if (magnetActive && --magnetTimer <= 0) magnetActive = false;

  // 스테이지 클리어
  if (avoids >= 30) {
    gameState = 'stageclear';
    score += 500 * stage;
    setTimeout(() => { stage++; avoids = 0; resetObjects(); gameState = 'playing'; }, 1800);
  }
}

function collectItem(arr, type) {
  return arr.filter((item, i) => {
    item.y += item.speed || 2;
    if (hit(player, item.x, item.y, 24, 24)) {
      if (type === 'star')   score += 50;
      if (type === 'coin')   { coins++; totalCoins++; }
      if (type === 'hammer') { player.shield = true; player.shieldTimer = 600; }
      if (type === 'magnet') { magnetActive = true; magnetTimer = 300; }
      return false;
    }
    return item.y < canvas.height + 50;
  });
}

function hit(p, x, y, w, h) {
  const margin = 8;
  return !(
    p.x + margin + p.width  - margin*2 < x ||
    x + w  < p.x + margin ||
    p.y + margin + p.height - margin*2 < y ||
    y + h  < p.y + margin
  );
}

function triggerGameOver() {
  gameState = 'gameover';
  if (score > highScore) { highScore = score; localStorage.setItem('pixelSkyHighScore', highScore); }
  localStorage.setItem('pixelSkyTotalCoins', totalCoins);
}

function resetObjects() {
  enemies = []; birds = []; lightnings = [];
  stars = []; coinItems = []; hammers = []; magnets = [];
}

function resetGame() {
  score = 0; coins = 0; stage = 1; avoids = 0;
  player.x = 175; player.y = 450;
  player.shield = false; player.shieldTimer = 0;
  magnetActive = false; magnetTimer = 0;
  resetObjects();
  gameState = 'playing';
}

// ========================
//   화면 그리기
// ========================
function drawHUD() {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 0, canvas.width, 38);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Courier New';
  ctx.fillText(`SCORE:${score}`, 6, 16);
  ctx.fillText(`ST:${stage}`, 160, 16);
  ctx.fillText(`AVD:${avoids}/30`, 230, 16);
  ctx.fillText(`💰${coins}`, 330, 16);

  if (player.shield)  { ctx.fillStyle = '#00ffff'; ctx.fillText('🛡SHIELD', 6, 34); }
  if (magnetActive)   { ctx.fillStyle = '#3498db'; ctx.fillText('🧲MAGNET', 160, 34); }
}

function drawTitle() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(20, 80, 360, 420);
  ctx.strokeStyle = '#ffeb3b';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 80, 360, 420);

  ctx.fillStyle = '#ffeb3b';
  ctx.font = 'bold 26px Courier New';
  ctx.fillText('PIXEL SKY DODGER', 38, 130);

  drawSprite('character', 170, 150, 60, 70);

  ctx.fillStyle = '#fff';
  ctx.font = '15px Courier New';
  ctx.fillText('방향키 / 터치로 비행기 이동', 44, 250);
  ctx.fillText('적기·새·번개를 피하자!', 60, 278);
  ctx.fillText('별·코인·망치·자석 모으기', 50, 306);

  ctx.fillStyle = '#2ecc71';
  ctx.font = 'bold 20px Courier New';
  ctx.fillText('▶  화면 터치로 시작  ◀', 60, 380);

  ctx.fillStyle = '#aaa';
  ctx.font = '13px Courier New';
  ctx.fillText(`최고점수: ${highScore}`, 140, 420);
  ctx.fillText(`총 코인: ${totalCoins}`, 150, 440);
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#e74c3c';
  ctx.font = 'bold 44px Courier New';
  ctx.fillText('GAME OVER', 45, 180);

  ctx.fillStyle = '#fff';
  ctx.font = '22px Courier New';
  ctx.fillText(`SCORE:  ${score}`, 110, 260);
  ctx.fillText(`BEST:   ${highScore}`, 110, 295);
  ctx.fillText(`COINS:  ${totalCoins}`, 110, 330);

  ctx.fillStyle = '#2ecc71';
  ctx.font = '20px Courier New';
  ctx.fillText('터치하면 다시 시작', 90, 420);
}

function drawStageClear() {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#2ecc71';
  ctx.font = 'bold 36px Courier New';
  ctx.fillText(`STAGE ${stage} CLEAR!`, 55, 230);

  ctx.fillStyle = '#fff';
  ctx.font = '24px Courier New';
  ctx.fillText(`+${500 * stage} 보너스 점수`, 90, 290);
  ctx.fillText('다음 스테이지 준비...', 65, 380);
}

// ========================
//   메인 루프
// ========================
function loop() {
  // 하늘 배경
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#1a6fa8');
  grad.addColorStop(1, '#5dade2');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 배경 구름
  clouds.forEach(c => {
    drawCloud(c);
    c.x -= c.speed;
    if (c.x < -c.size * 2.5) c.x = canvas.width + c.size * 2;
  });

  if (gameState === 'playing') {
    if (!spritesReady()) {
      ctx.fillStyle = '#fff';
      ctx.font = '20px Courier New';
      ctx.fillText('로딩 중...', 160, 300);
      requestAnimationFrame(loop);
      return;
    }

    updateGame();

    // 플레이어
    drawSprite('character', player.x, player.y, player.width, player.height);
    if (player.shield) {
      ctx.strokeStyle = 'rgba(0,255,255,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(player.x + player.width/2, player.y + player.height/2,
                  player.width/2 + 6, player.height/2 + 6, 0, 0, Math.PI*2);
      ctx.stroke();
    }

    // 적기
    enemies.forEach(e => drawSprite('airplane', e.x, e.y, 50, 38));

    // 새 (creature 스프라이트)
    birds.forEach(b => drawSprite('creature', b.x, b.y, 36, 28));

    // 번개
    lightnings.forEach(l => drawSprite('lightning', l.x, l.y, 30, 60));

    // 별 (explosion 스프라이트)
    stars.forEach(s => drawSprite('explosion', s.x, s.y, 28, 28));

    // 코인
    coinItems.forEach(c => drawSprite('coin', c.x, c.y, 24, 24));

    // 망치 → flag 스프라이트
    hammers.forEach(h => drawSprite('flag', h.x, h.y, 28, 28));

    // 자석
    magnets.forEach(m => drawSprite('magnet', m.x, m.y, 28, 28));

    // 폭발 이펙트
    explosions.forEach(e => {
      ctx.globalAlpha = e.t / 20;
      drawSprite('explosion', e.x - 20, e.y - 20, 50, 50);
      ctx.globalAlpha = 1;
    });

  } else if (gameState === 'title') {
    drawTitle();
  } else if (gameState === 'gameover') {
    drawGameOver();
  } else if (gameState === 'stageclear') {
    drawStageClear();
  }

  drawHUD();
  requestAnimationFrame(loop);
}

// ========================
//   입력 처리
// ========================
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === ' ' || e.key === 'Enter') {
    if (gameState === 'title' || gameState === 'gameover') resetGame();
  }
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  if (gameState !== 'playing') { resetGame(); return; }
  touchX = e.touches[0].clientX - canvas.getBoundingClientRect().left;
  touchActive = true;
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  touchX = e.touches[0].clientX - canvas.getBoundingClientRect().left;
}, { passive: false });

canvas.addEventListener('touchend', e => {
  e.preventDefault();
  touchActive = false;
}, { passive: false });

['left','right','up','down'].forEach(id => {
  const btn = document.getElementById(id);
  const key = 'Arrow' + id.charAt(0).toUpperCase() + id.slice(1);
  btn.addEventListener('touchstart', e => { e.preventDefault(); keys[key] = true; }, { passive: false });
  btn.addEventListener('touchend',   e => { e.preventDefault(); keys[key] = false; }, { passive: false });
});

document.getElementById('magnetBtn').addEventListener('touchstart', e => {
  e.preventDefault();
  if (!magnetActive) { magnetActive = true; magnetTimer = 420; }
}, { passive: false });

loop();
