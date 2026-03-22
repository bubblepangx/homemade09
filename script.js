// Pixel Sky Dodger - v2
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ========================
//   스프라이트 로드
// ========================
const IMG = {};
['airplane','character','clock','cloud','creature','flag','flower','lightning','magnet'].forEach(n=>{
  const i=new Image(); i.src=`sprites/${n}.png`; IMG[n]=i;
});
function spr(name,x,y,w,h){ if(IMG[name]?.complete) ctx.drawImage(IMG[name],x,y,w,h); }

// ========================
//   WEB AUDIO (음악 + SFX)
// ========================
let audioCtx = null;
let musicNodes = [];
let currentMelodyIdx = -1;
let beatTimer = null;
let beatStep = 0;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

// 음표 주파수
const N = {
  C3:130.8,D3:146.8,E3:164.8,G3:196,A3:220,B3:246.9,
  C4:261.6,D4:293.7,E4:329.6,F4:349.2,G4:392,A4:440,B4:493.9,
  C5:523.3,D5:587.3,E5:659.3,F5:698.5,G5:784,A5:880,
  _:0 // rest
};

// 스테이지별 멜로디 (8음 루프)
const MELODIES = [
  [N.C4,N.E4,N.G4,N.C5,N.G4,N.E4,N.C4,N._],       // 1: 밝고 단순
  [N.G4,N.A4,N.C5,N.E5,N.C5,N.A4,N.G4,N.E4],       // 2: 조금 빠르게
  [N.E4,N.G4,N.B4,N.D5,N.G5,N.D5,N.B4,N.G4],       // 3: 우주스러운
  [N.A4,N.C5,N.E5,N.G5,N.E5,N.C5,N.A4,N._],        // 4: 긴장감
  [N.C5,N.E5,N.G5,N.A5,N.G5,N.E5,N.C5,N.G4],       // 5+: 에픽
];

// 베이스라인
const BASS = [
  [N.C3,N._,N.G3,N._,N.C3,N._,N.G3,N._],
  [N.G3,N._,N.D3,N._,N.G3,N._,N.D3,N._],
  [N.E3,N._,N.B3,N._,N.E3,N._,N.B3,N._],
  [N.A3,N._,N.E3,N._,N.A3,N._,N.E3,N._],
  [N.C3,N._,N.G3,N._,N.C4,N._,N.G3,N._],
];

function playNote(freq, time, dur, type='square', vol=0.08) {
  if (!audioCtx || freq === 0) return null;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(time); osc.stop(time + dur + 0.05);
  return osc;
}

function startMusic(stageNum) {
  if (!audioCtx) return;
  stopMusic();
  const idx = Math.min(stageNum - 1, MELODIES.length - 1);
  currentMelodyIdx = idx;
  const bpm = 160 + stageNum * 8;
  const beat = 60 / bpm;
  beatStep = 0;

  function tick() {
    const t = audioCtx.currentTime;
    const mel = MELODIES[idx];
    const bas = BASS[idx];
    playNote(mel[beatStep], t, beat * 0.7, 'square', 0.07);
    playNote(bas[beatStep], t, beat * 0.8, 'triangle', 0.06);
    // 드럼(킥): 매 2박
    if (beatStep % 2 === 0) playNote(80, t, beat*0.3, 'sine', 0.12);
    // 스네어: 1,3박
    if (beatStep % 4 === 2) {
      const ns = audioCtx.createOscillator();
      const ng = audioCtx.createGain();
      ns.type = 'sawtooth'; ns.frequency.value = 200;
      ng.gain.setValueAtTime(0.05, t); ng.gain.exponentialRampToValueAtTime(0.001, t+0.08);
      ns.connect(ng); ng.connect(audioCtx.destination);
      ns.start(t); ns.stop(t+0.1);
    }
    beatStep = (beatStep + 1) % 8;
    beatTimer = setTimeout(tick, beat * 1000);
  }
  tick();
}

function stopMusic() {
  if (beatTimer) clearTimeout(beatTimer);
}

// SFX
function sfxCoin() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  playNote(N.E5, t, 0.08, 'square', 0.1);
  playNote(N.G5, t+0.08, 0.1, 'square', 0.1);
}

function sfxDing() {  // 자석 달라붙을때
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  playNote(N.A5, t, 0.06, 'sine', 0.12);
  playNote(N.C5, t+0.06, 0.08, 'sine', 0.08);
}

function sfxHit() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  playNote(N.A3, t, 0.1, 'sawtooth', 0.15);
  playNote(N.G3, t+0.1, 0.15, 'sawtooth', 0.1);
}

function sfxPowerup() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  [N.C5,N.E5,N.G5,N.C5].forEach((f,i)=>playNote(f,t+i*0.07,0.1,'square',0.1));
}

// ========================
//   캐릭터 그리기 함수들
// ========================

// 주인공: 가운데 로켓 캐릭터 (프로펠러+둥근몸통+날개+물고기꼬리)
function drawPlayer(x, y, w, h) {
  const cx = x + w/2, cy = y + h/2;
  ctx.save();
  ctx.translate(cx, cy);

  // 물고기 꼬리 (하단)
  ctx.fillStyle = '#546e7a';
  ctx.beginPath();
  ctx.moveTo(0, h*0.28);
  ctx.lineTo(-w*0.22, h*0.48);
  ctx.lineTo(w*0.22, h*0.48);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#263238'; ctx.lineWidth = 2; ctx.stroke();

  // 날개 (좌우)
  ctx.fillStyle = '#78909c';
  // 왼쪽 날개
  ctx.beginPath();
  ctx.moveTo(-w*0.12, -h*0.08);
  ctx.lineTo(-w*0.48, h*0.18);
  ctx.lineTo(-w*0.3, h*0.22);
  ctx.lineTo(-w*0.1, h*0.1);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // 오른쪽 날개
  ctx.beginPath();
  ctx.moveTo(w*0.12, -h*0.08);
  ctx.lineTo(w*0.48, h*0.18);
  ctx.lineTo(w*0.3, h*0.22);
  ctx.lineTo(w*0.1, h*0.1);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // 몸통 (원형)
  ctx.fillStyle = '#90a4ae';
  ctx.beginPath();
  ctx.ellipse(0, h*0.05, w*0.22, h*0.3, 0, 0, Math.PI*2);
  ctx.fill(); ctx.stroke();

  // 몸통 도트 패턴
  ctx.fillStyle = '#37474f';
  for (let i = -1; i <= 1; i++) {
    for (let j = -2; j <= 2; j++) {
      ctx.beginPath();
      ctx.arc(i*w*0.08, h*0.05 + j*h*0.08, 2.5, 0, Math.PI*2);
      ctx.fill();
    }
  }

  // 프로펠러/헤드 (상단)
  ctx.fillStyle = '#455a64';
  ctx.fillRect(-w*0.04, -h*0.42, w*0.08, h*0.18);
  // 프로펠러 바
  ctx.fillStyle = '#b0bec5';
  ctx.fillRect(-w*0.3, -h*0.38, w*0.6, h*0.07);
  ctx.strokeRect(-w*0.3, -h*0.38, w*0.6, h*0.07);
  // 중심원
  ctx.fillStyle = '#546e7a';
  ctx.beginPath();
  ctx.arc(0, -h*0.34, w*0.08, 0, Math.PI*2);
  ctx.fill(); ctx.stroke();

  ctx.restore();
}

// 적 비행기 (위에서 아래로, 델타익)
function drawEnemyPlane(x, y, w, h, dir=1) {
  const cx = x+w/2, cy = y+h/2;
  ctx.save(); ctx.translate(cx, cy);

  // 기체 색상 (방향에 따라 좌우 반전)
  ctx.scale(dir, 1);

  // 델타 날개
  ctx.fillStyle = '#e53935';
  ctx.beginPath();
  ctx.moveTo(0, -h*0.45);
  ctx.lineTo(-w*0.48, h*0.35);
  ctx.lineTo(-w*0.1, h*0.2);
  ctx.lineTo(0, h*0.45);
  ctx.lineTo(w*0.1, h*0.2);
  ctx.lineTo(w*0.48, h*0.35);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#b71c1c'; ctx.lineWidth=2; ctx.stroke();

  // 동체
  ctx.fillStyle = '#ef9a9a';
  ctx.beginPath();
  ctx.ellipse(0, 0, w*0.12, h*0.38, 0, 0, Math.PI*2);
  ctx.fill(); ctx.stroke();

  // 날개 도트
  ctx.fillStyle = '#b71c1c';
  [-w*0.28, w*0.28].forEach(px=>{
    ctx.beginPath(); ctx.arc(px, h*0.1, 4, 0, Math.PI*2); ctx.fill();
  });

  // 코크핏
  ctx.fillStyle = '#90caf9';
  ctx.beginPath();
  ctx.ellipse(0, -h*0.18, w*0.07, h*0.1, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}

// 새 (가로로 날아오는 구부러진 새)
function drawBird(x, y, w, h) {
  const cx = x+w/2, cy = y+h/2;
  ctx.save(); ctx.translate(cx, cy);

  ctx.strokeStyle = '#37474f'; ctx.lineWidth = 3;
  ctx.fillStyle = '#78909c';

  // 몸통
  ctx.beginPath();
  ctx.ellipse(0, 0, w*0.22, h*0.28, 0, 0, Math.PI*2);
  ctx.fill(); ctx.stroke();

  // 굽어진 날개 (특징적인 W자형)
  ctx.fillStyle = '#90a4ae';
  // 왼쪽
  ctx.beginPath();
  ctx.moveTo(-w*0.18, -h*0.05);
  ctx.quadraticCurveTo(-w*0.45, -h*0.38, -w*0.55, h*0.1);
  ctx.quadraticCurveTo(-w*0.3, h*0.18, -w*0.18, h*0.05);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // 오른쪽
  ctx.beginPath();
  ctx.moveTo(w*0.18, -h*0.05);
  ctx.quadraticCurveTo(w*0.45, -h*0.38, w*0.55, h*0.1);
  ctx.quadraticCurveTo(w*0.3, h*0.18, w*0.18, h*0.05);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // 머리
  ctx.fillStyle = '#546e7a';
  ctx.beginPath(); ctx.arc(-w*0.28, -h*0.05, w*0.12, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // 눈
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-w*0.31, -h*0.08, 3, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(-w*0.31, -h*0.08, 1.5, 0, Math.PI*2); ctx.fill();
  // 부리
  ctx.fillStyle = '#f9a825';
  ctx.beginPath();
  ctx.moveTo(-w*0.4, -h*0.04);
  ctx.lineTo(-w*0.52, 0);
  ctx.lineTo(-w*0.4, h*0.04);
  ctx.closePath(); ctx.fill();

  // 발
  ctx.strokeStyle = '#546e7a'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(-w*0.08, h*0.28); ctx.lineTo(-w*0.18, h*0.45); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w*0.08, h*0.28); ctx.lineTo(w*0.18, h*0.45); ctx.stroke();

  ctx.restore();
}

// 꽃 (폭발처럼 생긴 꽃)
function drawFlower(x, y, w, h) {
  const cx = x+w/2, cy = y+h/2;
  ctx.save(); ctx.translate(cx, cy);
  const petals = 8;
  for (let i=0; i<petals; i++) {
    ctx.save();
    ctx.rotate((Math.PI*2/petals)*i);
    const hue = 20 + i*5;
    ctx.fillStyle = `hsl(${hue},90%,55%)`;
    ctx.strokeStyle = `hsl(${hue},70%,35%)`; ctx.lineWidth=1.5;
    ctx.beginPath();
    ctx.ellipse(0, -h*0.3, w*0.12, h*0.22, 0, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // 중심
  ctx.fillStyle = '#f9a825';
  ctx.beginPath(); ctx.arc(0,0,w*0.15,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#e65100'; ctx.lineWidth=2; ctx.stroke();
  ctx.restore();
}

// 시계 (코인)
function drawClock(x, y, w, h) {
  const cx=x+w/2, cy=y+h/2, r=Math.min(w,h)*0.42;
  ctx.save(); ctx.translate(cx, cy);
  // 테두리
  ctx.fillStyle='#ffd54f';
  ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#e65100'; ctx.lineWidth=3; ctx.stroke();
  // 눈금
  ctx.strokeStyle='#5d4037'; ctx.lineWidth=2;
  for(let i=0;i<12;i++){
    const a=Math.PI*2/12*i;
    const r1=r*0.75, r2=r*0.9;
    ctx.beginPath();
    ctx.moveTo(Math.sin(a)*r1, -Math.cos(a)*r1);
    ctx.lineTo(Math.sin(a)*r2, -Math.cos(a)*r2);
    ctx.stroke();
  }
  // 시침/분침
  ctx.strokeStyle='#3e2723'; ctx.lineWidth=3; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-r*0.5); ctx.stroke();
  ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(r*0.4,0); ctx.stroke();
  ctx.restore();
}

// 자석 (U자형, 빨강+파랑)
function drawMagnet(x, y, w, h) {
  const cx=x+w/2, cy=y+h/2;
  ctx.save(); ctx.translate(cx, cy);
  const thick=w*0.22, ar=h*0.35;

  // 오른쪽 (파랑)
  ctx.fillStyle='#1565c0';
  ctx.beginPath();
  ctx.rect(w*0.1, -h*0.45, thick, h*0.55);
  ctx.fill();
  ctx.strokeStyle='#0d47a1'; ctx.lineWidth=2; ctx.stroke();

  // 왼쪽 (빨강)
  ctx.fillStyle='#c62828';
  ctx.beginPath();
  ctx.rect(-w*0.1-thick, -h*0.45, thick, h*0.55);
  ctx.fill();
  ctx.strokeStyle='#b71c1c'; ctx.lineWidth=2; ctx.stroke();

  // 위 U자 연결 (반원)
  ctx.fillStyle='#78909c';
  ctx.beginPath();
  ctx.arc(0, -h*0.1, w*0.32, Math.PI, 0);
  ctx.lineTo(w*0.1, -h*0.45);
  ctx.lineTo(-w*0.1, -h*0.45);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // 끝단 노란 팁
  ctx.fillStyle='#ffee58';
  ctx.fillRect(-w*0.1-thick, h*0.08, thick, h*0.1);
  ctx.fillRect(w*0.1, h*0.08, thick, h*0.1);

  ctx.restore();
}

// 번개
function drawLightning(x, y, w, h) {
  ctx.save(); ctx.translate(x+w/2, y+h/2);
  ctx.strokeStyle='#fff176'; ctx.lineWidth=4; ctx.lineJoin='round'; ctx.lineCap='round';
  ctx.shadowColor='#ffeb3b'; ctx.shadowBlur=8;
  ctx.beginPath();
  ctx.moveTo(w*0.15, -h*0.48);
  ctx.lineTo(-w*0.05, -h*0.05);
  ctx.lineTo(w*0.1, -h*0.05);
  ctx.lineTo(-w*0.15, h*0.48);
  ctx.stroke();
  ctx.fillStyle='#ffee58';
  ctx.fill();
  ctx.shadowBlur=0;
  ctx.restore();
}

// 구름 (꽃모양 구름, 아이템)
function drawCloudItem(x, y, w, h) {
  const cx=x+w/2, cy=y+h/2;
  ctx.save(); ctx.translate(cx,cy);
  ctx.fillStyle='#eceff1';
  ctx.shadowColor='#90caf9'; ctx.shadowBlur=6;
  [[-w*0.18,-h*0.08,w*0.2],[w*0.18,-h*0.08,w*0.2],[0,-h*0.2,w*0.2],
   [-w*0.28,h*0.05,w*0.18],[w*0.28,h*0.05,w*0.18],[0,h*0.15,w*0.22]].forEach(([px,py,r])=>{
    ctx.beginPath(); ctx.arc(px,py,r/2,0,Math.PI*2); ctx.fill();
  });
  ctx.shadowBlur=0;
  ctx.restore();
}

// 선물상자 (망치 대신)
function drawBox(x, y, w, h) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle='#ef5350';
  ctx.fillRect(w*0.05, h*0.25, w*0.9, h*0.65);
  ctx.strokeStyle='#b71c1c'; ctx.lineWidth=2; ctx.strokeRect(w*0.05,h*0.25,w*0.9,h*0.65);
  // 리본 가로
  ctx.fillStyle='#fff176';
  ctx.fillRect(w*0.05, h*0.5, w*0.9, h*0.12);
  // 리본 세로
  ctx.fillRect(w*0.42, h*0.25, w*0.16, h*0.65);
  // 뚜껑
  ctx.fillStyle='#e53935';
  ctx.fillRect(0, h*0.15, w, h*0.14);
  ctx.strokeRect(0,h*0.15,w,h*0.14);
  // 리본 매듭
  ctx.fillStyle='#fff176';
  ctx.beginPath(); ctx.arc(w*0.5, h*0.22, w*0.1, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

// ========================
//   게임 상태
// ========================
let gameState = 'title';
let score=0, coins=0, stage=1, avoids=0, lives=3;
let highScore = parseInt(localStorage.getItem('psdHigh')||'0');
let totalCoins = parseInt(localStorage.getItem('psdCoins')||'0');
let invincible=0; // 피격 후 무적 프레임

const PW=72, PH=90; // 플레이어 크기 (크게)
const player = {
  x:164, y:440, width:PW, height:PH,
  speed:5, shield:false, shieldTimer:0
};

let keys={}, touchActive=false, touchX=0;
let magnetActive=false, magnetTimer=0, magnetPulse=0;
let enemies=[], coinItems=[], flowers=[], boxes=[], magnets=[];
let birds=[], lightnings=[], clouds=[], bgClouds=[];

for(let i=0;i<10;i++) bgClouds.push({
  x:Math.random()*500-50, y:Math.random()*260,
  size:28+Math.random()*40, speed:0.3+Math.random()*0.4
});

// ========================
//   게임 로직
// ========================
function spawnRate() {
  // 스테이지별 스폰 속도 (천천히 시작)
  return Math.min(0.008 + stage*0.003, 0.04);
}
function enemySpeed() { return 1.5 + stage*0.35; }

function updateGame() {
  let dx=0,dy=0;
  if(keys['ArrowLeft']||keys['a']) dx-=player.speed;
  if(keys['ArrowRight']||keys['d']) dx+=player.speed;
  if(keys['ArrowUp']||keys['w']) dy-=player.speed;
  if(keys['ArrowDown']||keys['s']) dy+=player.speed;
  if(touchActive) dx+=(touchX-(player.x+player.width/2))*0.15;

  player.x = Math.max(0,Math.min(canvas.width-player.width, player.x+dx));
  player.y = Math.max(44,Math.min(canvas.height-player.height-10, player.y+dy));
  if(stage>=4) player.y += Math.sin(Date.now()*0.007)*1.1;

  const sr = spawnRate();

  // 적기: 위→아래
  if(Math.random()<sr) {
    const fromLeft = Math.random()<0.5;
    enemies.push({
      x: Math.random()*(canvas.width-60), y:-60,
      speed: enemySpeed(),
      dir: fromLeft?1:-1,
      dx: (Math.random()-0.5)*1.5
    });
  }
  // 새: 좌우에서
  if(Math.random()<sr*0.8) {
    const fromLeft=Math.random()<0.5;
    birds.push({
      x: fromLeft?-70:canvas.width+10, y:80+Math.random()*300,
      speed: 2+stage*0.3, dir: fromLeft?1:-1
    });
  }
  // 번개: 스테이지 3+
  if(stage>=3 && Math.random()<0.006+stage*0.001) {
    lightnings.push({x:Math.random()*(canvas.width-44),y:-80,speed:4+stage*0.6});
  }
  // 아이템들
  if(Math.random()<0.009) coinItems.push({x:Math.random()*(canvas.width-36),y:-36,speed:1.8+stage*0.15});
  if(Math.random()<0.006) flowers.push({x:Math.random()*(canvas.width-40),y:-40,speed:1.6});
  if(Math.random()<0.004) boxes.push({x:Math.random()*(canvas.width-40),y:-40,speed:1.5});
  if(Math.random()<0.003) magnets.push({x:Math.random()*(canvas.width-40),y:-40,speed:1.5});

  // 자석 효과: 아이템 끌어당기기
  if(magnetActive) {
    magnetPulse = (magnetPulse+0.15)%(Math.PI*2);
    coinItems.forEach(c=>{
      const cx=c.x+18,cy=c.y+18,px=player.x+PW/2,py=player.y+PH/2;
      const dist=Math.hypot(px-cx,py-cy);
      if(dist<200){
        c.x+=(px-cx)*0.1; c.y+=(py-cy)*0.1;
      }
    });
  }

  if(invincible>0) invincible--;

  // 적기 업데이트
  enemies = enemies.filter(e=>{
    e.y += e.speed; e.x += e.dx;
    if(e.y>canvas.height+70){ avoids++; score+=5; return false; }
    if(invincible===0 && hit(player,e.x,e.y,60,72)){
      if(player.shield){player.shield=false;player.shieldTimer=0;sfxHit();}
      else { takeDamage(); }
      return false;
    }
    return true;
  });

  // 새
  birds = birds.filter(b=>{
    b.x+=b.speed*b.dir;
    if(b.x<-80||b.x>canvas.width+80) return false;
    if(invincible===0 && hit(player,b.x,b.y,56,44)){
      score=Math.max(0,score-10); sfxHit(); invincible=40;
      return false;
    }
    return true;
  });

  // 번개
  lightnings = lightnings.filter(l=>{
    l.y+=l.speed;
    if(invincible===0 && hit(player,l.x,l.y,36,72)){
      if(player.shield){player.shield=false;player.shieldTimer=0;sfxHit();}
      else takeDamage();
      return false;
    }
    return l.y<canvas.height+90;
  });

  // 아이템 수집
  coinItems = collectItem(coinItems,40,40,'coin');
  flowers   = collectItem(flowers,44,44,'flower');
  boxes     = collectItem(boxes,44,44,'box');
  magnets   = collectItem(magnets,44,44,'magnet');

  if(player.shieldTimer>0&&--player.shieldTimer<=0) player.shield=false;
  if(magnetActive&&--magnetTimer<=0){magnetActive=false;magnetPulse=0;}

  if(avoids>=30){
    gameState='stageclear';
    score+=500*stage;
    setTimeout(()=>{stage++;avoids=0;resetObjects();gameState='playing';startMusic(stage);},1800);
  }
}

function collectItem(arr,iw,ih,type){
  return arr.filter(item=>{
    item.y+=item.speed;
    if(hit(player,item.x,item.y,iw,ih)){
      if(type==='coin'){coins++;totalCoins++;sfxCoin();if(magnetActive)sfxDing();}
      if(type==='flower'){score+=80;sfxCoin();}
      if(type==='box'){player.shield=true;player.shieldTimer=480;sfxPowerup();}
      if(type==='magnet'){magnetActive=true;magnetTimer=360;magnetPulse=0;sfxPowerup();}
      return false;
    }
    return item.y<canvas.height+60;
  });
}

function hit(p,x,y,w,h){
  const m=10;
  return !(p.x+m+p.width-m*2<x||x+w<p.x+m||p.y+m+p.height-m*2<y||y+h<p.y+m);
}

function takeDamage(){
  lives--;
  sfxHit();
  invincible=90; // 1.5초 무적
  if(lives<=0) triggerGameOver();
}

function triggerGameOver(){
  gameState='gameover';
  if(score>highScore){highScore=score;localStorage.setItem('psdHigh',highScore);}
  localStorage.setItem('psdCoins',totalCoins);
  stopMusic();
}

function resetObjects(){
  enemies=[];birds=[];lightnings=[];coinItems=[];flowers=[];boxes=[];magnets=[];
}
function resetGame(){
  score=0;coins=0;stage=1;avoids=0;lives=3;invincible=0;
  player.x=164;player.y=440;player.shield=false;player.shieldTimer=0;
  magnetActive=false;magnetTimer=0;
  resetObjects(); gameState='playing'; startMusic(1);
}

// ========================
//   배경 구름 그리기
// ========================
function drawBgCloud(c){
  ctx.globalAlpha=0.45;
  ctx.fillStyle='#eceff1';
  ctx.beginPath();
  ctx.arc(c.x+c.size*0.5,c.y,c.size*0.55,0,Math.PI*2);
  ctx.arc(c.x+c.size*1.1,c.y-c.size*0.2,c.size*0.7,0,Math.PI*2);
  ctx.arc(c.x+c.size*0.1,c.y+c.size*0.1,c.size*0.6,0,Math.PI*2);
  ctx.fill();
  ctx.globalAlpha=1;
}

// ========================
//   UI 그리기
// ========================
function drawHUD(){
  ctx.fillStyle='rgba(0,0,0,0.55)';
  ctx.fillRect(0,0,canvas.width,42);
  ctx.fillStyle='#fff'; ctx.font='bold 13px Courier New';
  ctx.fillText(`SCORE:${score}`,6,15);
  ctx.fillText(`ST:${stage}`,168,15);
  ctx.fillText(`AVD:${avoids}/30`,228,15);
  // 목숨 하트
  ctx.font='15px sans-serif';
  ctx.fillText('❤️'.repeat(lives)+'🖤'.repeat(Math.max(0,3-lives)),280,15);
  // 아이템 상태
  if(player.shield){ctx.fillStyle='#00e5ff';ctx.font='bold 12px Courier New';ctx.fillText('🛡SHIELD',6,33);}
  if(magnetActive){ctx.fillStyle='#e040fb';ctx.font='bold 12px Courier New';ctx.fillText(`🧲${Math.ceil(magnetTimer/60)}s`,108,33);}
  ctx.fillStyle='#ffd54f';ctx.font='bold 12px Courier New';
  ctx.fillText(`💰${coins}`,280,33);
}

function drawTitle(){
  ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(18,70,364,440);
  ctx.strokeStyle='#ffd54f'; ctx.lineWidth=3; ctx.strokeRect(18,70,364,440);
  ctx.fillStyle='#ffd54f'; ctx.font='bold 24px Courier New';
  ctx.fillText('PIXEL SKY DODGER',36,112);
  drawPlayer(170,128,PW,PH);
  ctx.fillStyle='#fff'; ctx.font='13px Courier New';
  const lines=[
    '❤️ 목숨 3개로 시작',
    '✈️ 적기·⚡번개 → 목숨 -1',
    '🐦 새에 맞으면 → 점수 -10',
    '⏰+10  🌸+30  피하면+5',
    '📦방패(5초)  🧲자석(6초)',
    '30개 피하면 → 다음 스테이지!',
  ];
  lines.forEach((l,i)=>ctx.fillText(l,44,234+i*24));
  ctx.fillStyle='#69f0ae'; ctx.font='bold 18px Courier New';
  ctx.fillText('▶  화면 터치로 시작  ◀',60,380);
  ctx.fillStyle='#aaa'; ctx.font='12px Courier New';
  ctx.fillText(`최고:${highScore}  총코인:${totalCoins}`,120,420);
}

function drawGameOver(){
  ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#ef5350'; ctx.font='bold 44px Courier New'; ctx.fillText('GAME OVER',44,180);
  ctx.fillStyle='#fff'; ctx.font='22px Courier New';
  ctx.fillText(`SCORE:  ${score}`,110,255);
  ctx.fillText(`BEST:   ${highScore}`,110,290);
  ctx.fillText(`COINS:  ${totalCoins}`,110,325);
  ctx.fillStyle='#69f0ae'; ctx.font='18px Courier New';
  ctx.fillText('터치하면 다시 시작',92,415);
}

function drawStageClear(){
  ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#69f0ae'; ctx.font='bold 34px Courier New';
  ctx.fillText(`STAGE ${stage} CLEAR!`,52,230);
  ctx.fillStyle='#fff'; ctx.font='22px Courier New';
  ctx.fillText(`+${500*stage} 보너스!`,110,290);
  ctx.fillText('다음 스테이지 준비...',56,380);
}

// ========================
//   메인 루프
// ========================
function loop(){
  // 하늘 그라디언트
  const grad=ctx.createLinearGradient(0,0,0,canvas.height);
  const stageColor=['#0d47a1','#1565c0','#1a237e','#311b92','#880e4f'];
  const c1=stageColor[Math.min(stage-1,4)];
  grad.addColorStop(0,c1); grad.addColorStop(1,'#42a5f5');
  ctx.fillStyle=grad; ctx.fillRect(0,0,canvas.width,canvas.height);

  // 배경 별 (스테이지 올라갈수록 많아짐)
  ctx.fillStyle='rgba(255,255,255,0.6)';
  for(let i=0;i<stage*3;i++){
    const sx=(i*137+Date.now()*0.02)%canvas.width;
    const sy=(i*97)%canvas.height;
    ctx.fillRect(sx,sy,1.5,1.5);
  }

  bgClouds.forEach(c=>{
    drawBgCloud(c);
    c.x-=c.speed;
    if(c.x<-c.size*2.5) c.x=canvas.width+c.size*2;
  });

  if(gameState==='playing'){
    updateGame();

    // 자석 글로우 원
    if(magnetActive){
      const r=200+Math.sin(magnetPulse)*15;
      ctx.save();
      ctx.strokeStyle=`rgba(224,64,251,${0.4+Math.sin(magnetPulse)*0.3})`;
      ctx.lineWidth=3;
      ctx.shadowColor='#e040fb'; ctx.shadowBlur=20;
      ctx.beginPath();
      ctx.arc(player.x+PW/2,player.y+PH/2,r,0,Math.PI*2);
      ctx.stroke();
      ctx.shadowBlur=0;
      ctx.restore();
    }

    // 아이템
    coinItems.forEach(c=>spr('clock',   c.x,c.y,48,48));
    flowers.forEach(f  =>spr('flower',  f.x,f.y,52,52));
    boxes.forEach(b    =>spr('flag',    b.x,b.y,52,52));
    magnets.forEach(m  =>spr('magnet',  m.x,m.y,52,52));

    // 적
    enemies.forEach(e=>{
      ctx.save();
      if(e.dir===-1){ctx.translate(e.x+72,0);ctx.scale(-1,1);ctx.translate(-e.x,0);}
      spr('airplane',e.x,e.y,72,72);
      ctx.restore();
    });
    birds.forEach(b=>{
      ctx.save();
      if(b.dir===-1){ctx.translate(b.x+64,0);ctx.scale(-1,1);ctx.translate(-b.x,0);}
      spr('creature',b.x,b.y,64,50);
      ctx.restore();
    });
    lightnings.forEach(l=>spr('lightning',l.x,l.y,44,80));

    // 플레이어 (피격 무적 중 깜박임)
    if(invincible===0 || Math.floor(invincible/6)%2===0)
      spr('character',player.x,player.y,PW,PH);
    if(player.shield){
      ctx.strokeStyle='rgba(0,229,255,0.8)'; ctx.lineWidth=3;
      ctx.shadowColor='#00e5ff'; ctx.shadowBlur=15;
      ctx.beginPath();
      ctx.ellipse(player.x+PW/2,player.y+PH/2,PW/2+8,PH/2+8,0,0,Math.PI*2);
      ctx.stroke();
      ctx.shadowBlur=0;
    }

  } else if(gameState==='title')    drawTitle();
  else if(gameState==='gameover')   drawGameOver();
  else if(gameState==='stageclear') drawStageClear();

  drawHUD();
  requestAnimationFrame(loop);
}

// ========================
//   입력
// ========================
window.addEventListener('keydown',e=>{
  keys[e.key]=true;
  if((e.key===' '||e.key==='Enter')&&(gameState==='title'||gameState==='gameover')){
    initAudio(); resetGame();
  }
});
window.addEventListener('keyup',e=>{ keys[e.key]=false; });

canvas.addEventListener('touchstart',e=>{
  e.preventDefault();
  initAudio();
  if(gameState!=='playing'){resetGame();return;}
  touchX=e.touches[0].clientX-canvas.getBoundingClientRect().left;
  touchActive=true;
},{passive:false});

canvas.addEventListener('touchmove',e=>{
  e.preventDefault();
  touchX=e.touches[0].clientX-canvas.getBoundingClientRect().left;
},{passive:false});

canvas.addEventListener('touchend',e=>{e.preventDefault();touchActive=false;},{passive:false});

['left','right','up','down'].forEach(id=>{
  const btn=document.getElementById(id);
  const key='Arrow'+id.charAt(0).toUpperCase()+id.slice(1);
  btn.addEventListener('touchstart',e=>{e.preventDefault();initAudio();keys[key]=true;},{passive:false});
  btn.addEventListener('touchend',e=>{e.preventDefault();keys[key]=false;},{passive:false});
});

document.getElementById('magnetBtn').addEventListener('touchstart',e=>{
  e.preventDefault(); initAudio();
  if(!magnetActive){magnetActive=true;magnetTimer=420;sfxPowerup();}
},{passive:false});

loop();
