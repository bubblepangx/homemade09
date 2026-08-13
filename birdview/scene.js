/* =============================================================================
 *  군산시 미장동 58-45 외 3필지 (58-54, 58-83, 59-43)  장례식장 신축 (허가용)
 *  3D 조감도 모델 — 제출 도면(배치도 1/500, 평면도·입면도 1/150) 실측 치수 기준
 *
 *  좌표계 : X = 평면도 좌→우 (0 ~ 34.5m),  Z = 평면도 상→하 (0 ~ 23.0m),  Y = 상방
 *  정면(前) = 평면도 윗변(Z=0) → 35M 도로측
 * ========================================================================== */

const MM = 0.001;

/* ---------- 도면에서 읽은 치수 (m) ---------------------------------------- */
const B = {
  W: 34.5,            // 건물 장변 (1층평면도 8.0+8.0+6.0+6.0+6.5)
  D: 23.0,            // 건물 단변 (3.5+2.5+3.0+3.0+11.0)
  H1: 5.4,            // 1층 슬래브 상단 (입면도 1/150 실측)
  H2: 10.2,           // 2층 슬래브 상단 = 옥상 바닥
  PAR: 10.9,          // 2층 파라펫 상단
  PH: 13.4,           // 옥탑(계단실·기계실) 상단
  TERR: 4.0,          // 서측 2층 옥상 테라스 폭 (2층평면도 좌측 4,000)
  CORE_X: 28.0,       // 코어(계단실·EV·W/C) 시작 X  = 34.5 - 6.5
  CORE_Z: 12.0,       // 옥탑 깊이 (3.5+2.5+6.0)
  STAIR_Z: 3.5,       // 계단실 깊이
  BAND: 0.5,          // 1층 상부 금속 띠
  GLASS_RAIL: 1.1,    // 옥상 유리난간 높이 (파라펫 상단 기준)
};
const XBAY = [0, 8, 16, 22, 28, 34.5];
const ZBAY = [0, 3.5, 6.0, 9.0, 12.0, 23.0];

/* ---------- 유틸 : 캔버스 텍스처 ------------------------------------------ */
function cvs(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function makeTex(w, h, draw) {
  const [c, g] = cvs(w, h);
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* 회색벽돌 (1층 마감) */
function brickTex() {
  return makeTex(512, 512, (g, w, h) => {
    g.fillStyle = '#7d7b76'; g.fillRect(0, 0, w, h);          // 줄눈
    const rows = 16, bh = h / rows, bw = w / 4;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * bw / 2;
      for (let i = -1; i < 5; i++) {
        const x = i * bw + off, y = r * bh;
        const v = 138 + Math.floor(Math.random() * 26);
        g.fillStyle = `rgb(${v},${v - 3},${v - 8})`;
        g.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
      }
    }
  });
}
/* 인조 화강석 패널 (계단실 코어) */
function graniteTex() {
  return makeTex(512, 512, (g, w, h) => {
    g.fillStyle = '#d9d6ce'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 24000; i++) {                          // 석재 입자
      const v = 160 + Math.floor(Math.random() * 80);
      g.fillStyle = `rgba(${v},${v - 4},${v - 12},0.30)`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    g.strokeStyle = 'rgba(120,116,108,0.55)'; g.lineWidth = 3; // 패널 줄눈 (1모듈 = 1장)
    g.strokeRect(0, 0, w, h);
  });
}
/* 외장 타일 (2층·옥탑) */
function tileTex() {
  return makeTex(512, 512, (g, w, h) => {
    g.fillStyle = '#e9e5dc'; g.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = 236 + Math.floor(Math.random() * 12);
      g.fillStyle = `rgb(${v},${v - 3},${v - 10})`;
      g.fillRect(i * s + 1.5, j * s + 1.5, s - 3, s - 3);
    }
  });
}
/* 아스팔트 */
function asphaltTex() {
  return makeTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4b4b4d'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const v = 55 + Math.floor(Math.random() * 45);
      g.fillStyle = `rgba(${v},${v},${v + 2},0.5)`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
}
/* 잔디 (호텔형 스트라이프 예초) */
function lawnTex() {
  return makeTex(512, 512, (g, w, h) => {
    g.fillStyle = '#6f8f52'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2; i++) {
      g.fillStyle = i ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
      g.fillRect(0, i * h / 2, w, h / 2);
    }
    for (let i = 0; i < 24000; i++) {
      const v = Math.random() * 40;
      g.fillStyle = `rgba(${90 + v},${125 + v},${70 + v},0.35)`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
}
/* 화강석 판석 포장 */
function pavingTex() {
  return makeTex(512, 512, (g, w, h) => {
    g.fillStyle = '#b9b4ab'; g.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = 196 + Math.floor(Math.random() * 22);
      g.fillStyle = `rgb(${v},${v - 4},${v - 12})`;
      g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
    }
  });
}
/* 옥상 방수 마감 */
function roofTex() {
  return makeTex(256, 256, (g, w, h) => {
    g.fillStyle = '#9a9a95'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke();
    }
  });
}

/* ---------- 재료 ---------------------------------------------------------- */
let MAT = {};
function buildMaterials() {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  MAT = {
    brick:   std({ map: brickTex(),   roughness: 0.95, color: 0xffffff }),
    granite: std({ map: graniteTex(), roughness: 0.55, metalness: 0.02, color: 0xcdc7ba }),
    tile:    std({ map: tileTex(),    roughness: 0.45, metalness: 0.02 }),
    band:    std({ color: 0x5a6065, roughness: 0.42, metalness: 0.55 }),
    coping:  std({ color: 0xb9b6ae, roughness: 0.6 }),
    frame:   std({ color: 0xf3f2ee, roughness: 0.5, metalness: 0.1 }),
    glassW:  std({ color: 0x2c4450, roughness: 0.08, metalness: 0.85, transparent: true, opacity: 0.85 }),
    glassR:  std({ color: 0xbcd6e0, roughness: 0.03, metalness: 0.15, transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
    curtain: std({ color: 0x35525f, roughness: 0.06, metalness: 0.9, transparent: true, opacity: 0.78 }),
    roof:    std({ map: roofTex(), roughness: 0.9 }),
    asphalt: std({ map: asphaltTex(), roughness: 0.95 }),
    paving:  std({ map: pavingTex(), roughness: 0.8 }),
    lawn:    std({ map: lawnTex(), roughness: 1.0 }),
    soil:    std({ color: 0x6b6255, roughness: 1.0 }),
    water:   new THREE.MeshStandardMaterial({ color: 0x123a44, roughness: 0.11, metalness: 0.14, envMapIntensity: 0.5 }),
    stone:   std({ color: 0xc7c2b8, roughness: 0.75 }),
    hedge:   std({ color: 0x40632f, roughness: 1.0 }),
    trunk:   std({ color: 0x5b4634, roughness: 1.0 }),
    leaf1:   std({ color: 0x4c7a3a, roughness: 1.0 }),
    leaf2:   std({ color: 0x3f6b48, roughness: 1.0 }),
    leaf3:   std({ color: 0x6f8f4a, roughness: 1.0 }),
    line:    std({ color: 0xf0efe8, roughness: 0.9 }),
    wood:    std({ color: 0x8a6a44, roughness: 0.85 }),
    metal:   std({ color: 0x8d9296, roughness: 0.35, metalness: 0.8 }),
    car: [0xd8d8dc, 0x2b2f36, 0x8f1f24, 0x22405f, 0xb0b4b8].map(c => std({ color: c, roughness: 0.3, metalness: 0.6 })),
  };
}

/* ---------- 박스 헬퍼 (면적 비례 텍스처 반복) ------------------------------ */
function box(parent, mat, x0, x1, y0, y1, z0, z1, tile) {
  const sx = x1 - x0, sy = y1 - y0, sz = z1 - z0;
  const g = new THREE.BoxGeometry(sx, sy, sz);
  let m = mat;
  if (tile && mat.map) {
    const mk = (w, h) => {
      const c = mat.clone(); c.map = mat.map.clone();
      c.map.needsUpdate = true; c.map.repeat.set(Math.max(w / tile, .01), Math.max(h / tile, .01));
      return c;
    };
    m = [mk(sz, sy), mk(sz, sy), mk(sx, sz), mk(sx, sz), mk(sx, sy), mk(sx, sy)];
  }
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function slab(parent, mat, x0, x1, z0, z1, y, tile) {
  return box(parent, mat, x0, x1, y - 0.06, y, z0, z1, tile);
}
/* 속이 빈 띠(파라펫·캐노피) — 4면 스트립 */
function bandFrame(parent, mat, x0, x1, y0, y1, z0, z1, t) {
  box(parent, mat, x0, x1, y0, y1, z0, z0 + t, 0);
  box(parent, mat, x0, x1, y0, y1, z1 - t, z1, 0);
  box(parent, mat, x0, x0 + t, y0, y1, z0 + t, z1 - t, 0);
  box(parent, mat, x1 - t, x1, y0, y1, z0 + t, z1 - t, 0);
}

/* ---------- 창호 ---------------------------------------------------------- */
// face : 'N'(z0) 'S'(z1) 'W'(x0) 'E'(x1)
function window2(parent, face, a0, a1, y0, y1, opts = {}) {
  const t = 0.12, out = 0.06;
  const gm = opts.curtain ? MAT.curtain : MAT.glassW;
  const put = (m, X0, X1, Y0, Y1, Z0, Z1) => box(parent, m, X0, X1, Y0, Y1, Z0, Z1);
  const f = 0.10;                                   // 프레임 두께
  if (face === 'N' || face === 'S') {
    const z = face === 'N' ? -out : B.D + out;
    const z0 = face === 'N' ? z - t : z, z1 = face === 'N' ? z : z + t;
    put(MAT.frame, a0, a1, y0, y0 + f, z0, z1);
    put(MAT.frame, a0, a1, y1 - f, y1, z0, z1);
    put(MAT.frame, a0, a0 + f, y0, y1, z0, z1);
    put(MAT.frame, a1 - f, a1, y0, y1, z0, z1);
    put(gm, a0 + f, a1 - f, y0 + f, y1 - f, z0 + 0.03, z1 - 0.03);
    if (opts.mullion) {
      const n = Math.max(1, Math.round((a1 - a0) / 1.6));
      for (let i = 1; i < n; i++) {
        const x = a0 + (a1 - a0) * i / n;
        put(MAT.frame, x - 0.05, x + 0.05, y0, y1, z0, z1);
      }
    }
  } else {
    const x = face === 'W' ? -out : B.W + out;
    const x0 = face === 'W' ? x - t : x, x1 = face === 'W' ? x : x + t;
    put(MAT.frame, x0, x1, y0, y0 + f, a0, a1);
    put(MAT.frame, x0, x1, y1 - f, y1, a0, a1);
    put(MAT.frame, x0, x1, y0, y1, a0, a0 + f);
    put(MAT.frame, x0, x1, y0, y1, a1 - f, a1);
    put(gm, x0 + 0.03, x1 - 0.03, y0 + f, y1 - f, a0 + f, a1 - f);
  }
}

/* ---------- 유리 난간 ------------------------------------------------------ */
function glassRail(parent, x0, x1, z0, z1, y, h = B.GLASS_RAIL) {
  const t = 0.05, ins = 0.18;
  const seg = (X0, X1, Z0, Z1) => {
    box(parent, MAT.glassR, X0, X1, y, y + h - 0.06, Z0, Z1);
    box(parent, MAT.metal, X0 - 0.02, X1 + 0.02, y + h - 0.06, y + h, Z0 - 0.02, Z1 + 0.02);
  };
  seg(x0 + ins, x1 - ins, z0 + ins, z0 + ins + t);
  seg(x0 + ins, x1 - ins, z1 - ins - t, z1 - ins);
  seg(x0 + ins, x0 + ins + t, z0 + ins, z1 - ins);
  seg(x1 - ins - t, x1 - ins, z0 + ins, z1 - ins);
}

/* =============================================================================
 *  건물
 * ========================================================================== */
function buildBuilding() {
  const G = new THREE.Group(); G.name = '신청건물';

  /* --- 1층 : 34.5 x 23.0 x 5.4 --------------------------------------------
     정면(N) 좌측 = 평면 X 0~16.5 구간 → 회색벽돌 / 그 외 타일             */
  box(G, MAT.tile, 0, B.W, 0, B.H1, 0, B.D, 1.4);                 // 본체
  // 회색벽돌 외피 (1층 서측 : 정면도 기준 우측)
  box(G, MAT.brick, -0.09, 16.5, 0.0, B.H1, -0.09, 0.0, 0.9);     // 정면 N
  box(G, MAT.brick, -0.09, 16.5, 0.0, B.H1, B.D, B.D + 0.09, 0.9);// 배면 S
  box(G, MAT.brick, -0.09, 0.0, 0.0, B.H1, -0.09, B.D + 0.09, 0.9);// 우측면 W
  // 1층 상부 금속 띠 (캐노피 라인 +5.4~+5.9)
  bandFrame(G, MAT.band, -0.35, B.W + 0.35, B.H1, B.H1 + B.BAND, -0.35, B.D + 0.35, 0.55);

  /* --- 서측 2층 테라스(옥상) 4.0m ----------------------------------------- */
  box(G, MAT.roof, 0, B.TERR, B.H1, B.H1 + B.BAND, 0, B.D, 1.2);
  glassRail(G, -0.2, B.TERR + 0.15, -0.2, B.D + 0.2, B.H1 + B.BAND, 1.0);

  /* --- 2층 : X 4.0~34.5 --------------------------------------------------- */
  box(G, MAT.tile, B.TERR, B.W, B.H1 + B.BAND, B.H2, 0, B.D, 1.4);
  bandFrame(G, MAT.band, B.TERR - 0.25, B.W + 0.25, B.H2, B.PAR, -0.25, B.D + 0.25, 0.45); // 파라펫
  slab(G, MAT.roof, B.TERR, B.W, 0, B.D, B.H2 + 0.02, 1.2);                        // 옥상 바닥
  glassRail(G, B.TERR - 0.1, B.W + 0.1, -0.1, B.D + 0.1, B.PAR);                   // 옥상 유리난간

  /* --- 옥탑 : 계단실 + EV + 기계실&물탱크실  (X 28.0~34.5, Z 0~12.0) ------- */
  box(G, MAT.tile, B.CORE_X, B.W, B.H2, B.PH, 0, B.CORE_Z, 1.4);
  bandFrame(G, MAT.band, B.CORE_X - 0.2, B.W + 0.2, B.PH - 0.45, B.PH, -0.2, B.CORE_Z + 0.2, 0.3);
  // 기계실 루버
  for (let i = 0; i < 6; i++)
    box(G, MAT.metal, B.CORE_X + 0.3, B.W - 0.3, B.H2 + 0.9 + i * 0.28, B.H2 + 1.05 + i * 0.28,
        B.CORE_Z, B.CORE_Z + 0.08, 0);

  /* --- 인조 화강석 코어 (정면 좌측 계단실) : 지상~옥탑 전高 --------------- */
  const gt = 0.22;
  box(G, MAT.granite, B.CORE_X - gt, B.W + gt, 0, B.PH, -gt, 0.0, 1.6);            // 정면 N 면
  box(G, MAT.granite, B.W, B.W + gt, 0, B.PH, -gt, B.CORE_Z, 1.6);                 // 좌측면 E 면
  box(G, MAT.granite, B.CORE_X - gt, B.CORE_X, 0, B.PH, -gt, B.STAIR_Z, 1.6);      // 코어 측벽 노출부
  box(G, MAT.coping, B.CORE_X - gt - 0.12, B.W + gt + 0.12, B.PH, B.PH + 0.25, -gt - 0.12, B.CORE_Z + 0.12, 0);

  /* --- 정면 주출입 : 방풍실 + 커튼월 (평면 X 19.0~27.0) -------------------- */
  window2(G, 'N', 19.2, 26.8, 0.15, 5.15, { curtain: true, mullion: true });
  box(G, MAT.band, 18.9, 27.1, 5.15, 5.45, -0.9, 0.05, 0);          // 출입구 캐노피
  box(G, MAT.frame, 22.3, 22.5, 0.15, 3.3, -0.14, -0.02, 0);        // 자동문 중앙 멀리언
  // 진입 계단 (배치도 정면 계단)
  for (let i = 0; i < 3; i++)
    box(G, MAT.stone, 19.0, 24.0, 0.15 - (i + 1) * 0.15, 0.15 - i * 0.15, -0.35 - i * 0.35, 0.0, 0);

  /* --- 정면(N) 1층 벽돌부 창 4EA (입면도 기준) ---------------------------- */
  [3.2, 6.6, 10.6, 14.0].forEach(x => window2(G, 'N', x, x + 1.7, 2.15, 3.55));
  /* --- 정면(N) 2층 창 7EA -------------------------------------------------- */
  [6.0, 9.4, 12.8, 16.2, 20.4, 23.8, 27.2].forEach(x => window2(G, 'N', x, x + 1.5, 6.7, 8.6));
  /* --- 정면 계단실 창 ----------------------------------------------------- */
  window2(G, 'N', 30.4, 31.6, 7.4, 8.7);
  window2(G, 'N', 30.4, 31.6, 2.4, 3.7);

  /* --- 배면(S) : 2층 5EA / 1층 4EA ---------------------------------------- */
  [7.5, 12.0, 16.5, 21.0, 26.0].forEach(x => window2(G, 'S', x, x + 1.5, 6.7, 8.6));
  [10.0, 14.0, 18.5, 24.5].forEach(x => window2(G, 'S', x, x + 1.5, 2.15, 3.55));

  /* --- 우측면(W, X=0) 1층 벽돌부 창 4EA ----------------------------------- */
  [4.0, 8.4, 13.6, 17.8].forEach(z => window2(G, 'W', z, z + 1.5, 2.15, 3.55));
  box(G, MAT.metal, -0.25, 0.0, 0.0, 1.0, 20.6, 21.4, 0);          // 실외기·소화수조 박스

  /* --- 좌측면(E, X=34.5) : 발인실 출입문 + 창 ----------------------------- */
  window2(G, 'E', 20.3, 21.9, 0.15, 2.55, { curtain: true });      // 발인실 출입
  for (let i = 0; i < 3; i++)
    box(G, MAT.stone, B.W, B.W + 0.9 + i * 0.3, 0.15 - (i + 1) * 0.15, 0.15 - i * 0.15, 20.1, 22.1, 0);
  [13.0, 16.4].forEach(z => window2(G, 'E', z, z + 1.5, 2.15, 3.55));
  [13.0, 16.4, 19.8].forEach(z => window2(G, 'E', z, z + 1.5, 6.7, 8.6));
  window2(G, 'E', 1.2, 2.4, 7.4, 8.7);

  /* --- 옥상 설비 ----------------------------------------------------------- */
  box(G, MAT.metal, 8.0, 11.0, B.H2 + 0.05, B.H2 + 1.15, 6.0, 9.0, 0);   // 실외기 유닛
  box(G, MAT.metal, 12.5, 15.0, B.H2 + 0.05, B.H2 + 0.9, 6.0, 8.2, 0);
  box(G, MAT.metal, 8.4, 10.6, B.H2 + 1.15, B.H2 + 1.3, 6.4, 8.6, 0);

  return G;
}

/* =============================================================================
 *  대지 · 외부 (배치도 1/500 기준, 전/답 제외 구역은 미조성)
 * ========================================================================== */
function buildSite() {
  const G = new THREE.Group(); G.name = '대지';

  /* --- 지반 (주변 전/답 = 미조성 구역, 조감 범위만 표현) ------------------- */
  const fieldTex = makeTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8f9679'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16000; i++) {
      const v = Math.random() * 34;
      g.fillStyle = `rgba(${132 + v},${140 + v},${104 + v},0.35)`;
      g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
  });
  const field = new THREE.MeshStandardMaterial({ map: fieldTex, roughness: 1.0 });
  field.map.repeat.set(60, 46);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(980, 760), field);
  ground.rotation.x = -Math.PI / 2; ground.position.set(40, -0.30, -18);
  ground.receiveShadow = true; G.add(ground);

  /* --- 대지 정지면 (포장/잔디) -------------------------------------------- */
  slab(G, MAT.paving, -14, 44, -26, 32, -0.02, 2.0);              // 건물 주변 포장
  slab(G, MAT.asphalt, -8, 44, -26, -13, 0.0, 5.0);               // 주차장 아스팔트
  slab(G, MAT.lawn, 44, 96, -14, 30, -0.03, 6.0);                 // 정원 조성부
  slab(G, MAT.lawn, -14, -6, -26, 32, -0.03, 6.0);                // 서측 완충녹지

  /* --- 35M 도로 (정면) + 보도 --------------------------------------------- */
  slab(G, MAT.paving, -60, 120, -30, -26, 0.06, 2.0);             // 보도
  slab(G, MAT.asphalt, -60, 120, -65, -30, 0.0, 6.0);             // 차도 35m
  for (let x = -58; x < 120; x += 6)                              // 중앙선
    box(G, MAT.line, x, x + 3.2, 0.005, 0.02, -47.3, -46.9, 0);
  for (let x = -58; x < 120; x += 8) {                            // 차선
    [-56, -38].forEach(z => box(G, MAT.line, x, x + 4, 0.005, 0.02, z, z + 0.16, 0));
  }
  /* --- 강변로 + 산책로 + 경포천 (35M 도로 건너 우측) ---------------------- */
  slab(G, MAT.asphalt, 10, 190, -78, -66, 0.0, 6.0);              // 강변로
  slab(G, MAT.lawn, 10, 190, -92, -78, -0.02, 6.0);               // 하천 둔치
  slab(G, MAT.paving, 10, 190, -86, -83, 0.04, 2.0);              // 산책로
  const water = new THREE.Mesh(new THREE.PlaneGeometry(180, 24), MAT.water);
  water.rotation.x = -Math.PI / 2; water.position.set(100, -0.22, -105);
  water.receiveShadow = true; G.add(water);                        // 경포천
  slab(G, MAT.stone, 10, 190, -118, -116, 0.15, 2.0);             // 호안(대안)
  slab(G, MAT.stone, 10, 190, -94, -92, 0.15, 2.0);               // 호안(근안)

  /* --- 주차구획 (배치도 : 정면 전면 + 서측) -------------------------------- */
  const stall = (x, z, w = 2.5, d = 5.0, rot = 0) => {
    const t = 0.1;
    box(G, MAT.line, x, x + t, 0.005, 0.02, z, z + d, 0);
    box(G, MAT.line, x + w, x + w + t, 0.005, 0.02, z, z + d, 0);
    box(G, MAT.line, x, x + w, 0.005, 0.02, z, z + t, 0);
  };
  for (let i = 0; i < 8; i++) stall(2 + i * 2.6, -24.5);           // 전면 8대
  for (let i = 0; i < 6; i++) stall(24 + i * 2.6, -24.5);          // 전면 6대
  for (let i = 0; i < 6; i++) stall(-5.0, -14 + i * 2.6, 5.0, 2.5);// 서측 6대 (평행)
  // 장애인 주차 2면
  [24.0, 27.0].forEach(x => {
    box(G, MAT.line, x, x + 2.9, 0.005, 0.02, -19.6, -14.6, 0);
    box(G, new THREE.MeshStandardMaterial({ color: 0x2f5fa8, roughness: .9 }),
        x + 0.15, x + 2.75, 0.02, 0.03, -19.45, -14.75, 0);
  });

  /* --- 차량 (스케일 기준) --------------------------------------------------- */
  const car = (x, z, rot = 0, ci = 0) => {
    const c = new THREE.Group();
    box(c, MAT.car[ci % 5], -0.85, 0.85, 0.25, 0.95, -2.2, 2.2, 0);
    box(c, MAT.glassW, -0.78, 0.78, 0.95, 1.42, -0.9, 1.1, 0);
    [[-0.88, -1.5], [0.88, -1.5], [-0.88, 1.5], [0.88, 1.5]].forEach(([wx, wz]) => {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 14),
        new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: .9 }));
      t.rotation.z = Math.PI / 2; t.position.set(wx, 0.32, wz); t.castShadow = true; c.add(t);
    });
    c.position.set(x, 0, z); c.rotation.y = rot; G.add(c);
  };
  [0, 1, 3, 4, 6].forEach((i, k) => car(3.25 + i * 2.6, -22.0, 0, k));
  [0, 2, 3].forEach((i, k) => car(25.25 + i * 2.6, -22.0, 0, k + 2));
  car(-2.5, -10.0, Math.PI / 2, 1);
  car(-2.5, -4.0, Math.PI / 2, 4);

  slab(G, MAT.asphalt, -8, -0.5, -14, 4.5, 0.0, 5.0);             // 서측 주차 아스팔트
  slab(G, MAT.asphalt, 6, 16, -31, -25, 0.07, 5.0);               // 진입로 (도로 → 주차장)
  slab(G, MAT.asphalt, 30, 38, -31, -25, 0.07, 5.0);              // 진출로

  /* --- 진입 드롭오프 광장 --------------------------------------------------- */
  slab(G, MAT.paving, 17.5, 28.5, -13.0, -0.2, 0.05, 1.2);

  /* --- 대지경계 식재대 (완충녹지) ------------------------------------------ */
  for (let i = 0; i < 22; i++) box(G, MAT.hedge, -13.4, -12.0, 0, 0.8, -25 + i * 2.6, -23.8 + i * 2.6, 0);
  for (let i = 0; i < 20; i++) box(G, MAT.hedge, -12 + i * 2.9, -10.8 + i * 2.9, 0, 0.8, 30.4, 31.8, 0);
  return G;
}

/* --- 원경 수목대 (조감 배경) ---------------------------------------------- */
function buildContext() {
  const G = new THREE.Group(); G.name = '원경';
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const belt = (x0, x1, z0, z1, n, hmin, hmax) => {
    for (let i = 0; i < n; i++)
      tree(G, x0 + rnd() * (x1 - x0), z0 + rnd() * (z1 - z0),
           hmin + rnd() * (hmax - hmin), Math.floor(rnd() * 3));
  };
  belt(-140, 240, 66, 102, 40, 6, 11);        // 배면측
  belt(-150, -70, -60, 90, 22, 6, 11);       // 우측
  belt(120, 250, -50, 90, 26, 6, 11);        // 좌측(정원 너머)
  belt(-140, 250, -150, -122, 30, 6, 11);    // 하천 건너편
  return G;
}

/* =============================================================================
 *  조경 — 정적인 물가가 있는 호텔형 정원 (동측 정원부)
 * ========================================================================== */
function tree(G, x, z, h = 6, type = 0) {
  const t = new THREE.Group();
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.035, h * 0.06, h * 0.45, 8), MAT.trunk);
  tr.position.y = h * 0.225; tr.castShadow = true; t.add(tr);
  if (type === 2) {                                    // 침엽수
    const c = new THREE.Mesh(new THREE.ConeGeometry(h * 0.26, h * 0.8, 10), MAT.leaf2);
    c.position.y = h * 0.62; c.castShadow = true; t.add(c);
  } else {                                             // 활엽수 (덩어리 3개)
    const m = type === 1 ? MAT.leaf3 : MAT.leaf1;
    [[0, 0.62, 0, 1.0], [0.3, 0.78, 0.15, 0.72], [-0.28, 0.72, -0.2, 0.66]].forEach(([dx, dy, dz, s]) => {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(h * 0.26 * s, 1), m);
      b.position.set(dx * h * 0.3, h * dy, dz * h * 0.3);
      b.castShadow = true; t.add(b);
    });
  }
  t.position.set(x, 0, z); t.rotation.y = Math.random() * 3;
  G.add(t);
}

function buildGarden() {
  const G = new THREE.Group(); G.name = '정원';

  /* --- 정적 수경(반사 연못) : 24.0 x 11.0 --------------------------------- */
  const px0 = 50, px1 = 74, pz0 = 2, pz1 = 13;
  bandFrame(G, MAT.stone, px0 - 0.8, px1 + 0.8, -0.05, 0.22, pz0 - 0.8, pz1 + 0.8, 0.8); // 석재 테두리
  box(G, MAT.soil, px0, px1, -0.5, 0.06, pz0, pz1, 0);
  const w = new THREE.Mesh(new THREE.PlaneGeometry(px1 - px0, pz1 - pz0), MAT.water);
  w.rotation.x = -Math.PI / 2; w.position.set((px0 + px1) / 2, 0.09, (pz0 + pz1) / 2);
  w.receiveShadow = true; G.add(w);
  // 디딤석 (수면 위)
  for (let i = 0; i < 9; i++)
    box(G, MAT.stone, px0 + 2.2 + i * 2.4, px0 + 3.8 + i * 2.4, 0.06, 0.20, 7.0, 8.6, 0);
  // 수경 상부 정형 화단 · 낮은 관목 열
  for (let i = 0; i < 12; i++) {
    box(G, MAT.hedge, px0 - 0.2 + i * 2.0, px0 + 1.3 + i * 2.0, 0, 0.55, pz0 - 2.6, pz0 - 1.5, 0);
    box(G, MAT.hedge, px0 - 0.2 + i * 2.0, px0 + 1.3 + i * 2.0, 0, 0.55, pz1 + 1.5, pz1 + 2.6, 0);
  }
  /* --- 중심 잔디마당 + 정형 산책로 ---------------------------------------- */
  slab(G, MAT.paving, 40, 92, 16.5, 19.5, 0.03, 1.5);            // 주 동선
  slab(G, MAT.paving, 40, 92, -4.5, -1.5, 0.03, 1.5);
  slab(G, MAT.paving, 44.5, 47.5, -4.5, 19.5, 0.03, 1.5);
  slab(G, MAT.paving, 84, 87, -4.5, 19.5, 0.03, 1.5);
  // 정형 헤지 (호텔형 대칭 식재)
  for (let i = 0; i < 10; i++) {
    box(G, MAT.hedge, 48 + i * 4.0, 50.6 + i * 4.0, 0, 0.7, 21.4, 24.0, 0);
    box(G, MAT.hedge, 48 + i * 4.0, 50.6 + i * 4.0, 0, 0.7, -8.6, -6.0, 0);
  }
  /* --- 파고라 (연못 축 끝) ------------------------------------------------- */
  const pg = new THREE.Group();
  for (const dx of [-3.2, 3.2]) for (const dz of [-2.6, 2.6]) {
    box(pg, MAT.wood, dx - 0.16, dx + 0.16, 0, 3.0, dz - 0.16, dz + 0.16, 0);
  }
  box(pg, MAT.wood, -3.6, 3.6, 3.0, 3.24, -3.0, -2.7, 0);
  box(pg, MAT.wood, -3.6, 3.6, 3.0, 3.24, 2.7, 3.0, 0);
  for (let i = 0; i <= 9; i++) box(pg, MAT.wood, -3.4 + i * 0.75, -3.1 + i * 0.75, 3.24, 3.4, -3.0, 3.0, 0);
  box(pg, MAT.paving, -4.2, 4.2, -0.02, 0.06, -3.6, 3.6, 1.2);
  pg.position.set(80.5, 0, 7.5); G.add(pg);

  /* --- 수목 --------------------------------------------------------------- */
  for (let i = 0; i < 8; i++) { tree(G, 46.5 + i * 5.6, -6.6, 6.5, i % 2); tree(G, 46.5 + i * 5.6, 22.0, 6.5, (i + 1) % 2); }
  [[42, 8, 8, 2], [42, 15, 7, 0], [42, 1, 7.5, 2], [90, 4, 7, 1], [90, 13, 7.5, 0],
   [77, -1.5, 5.5, 1], [77, 16.5, 5.5, 1], [55, 18.8, 5, 1], [66, -3.2, 5, 1]]
    .forEach(([x, z, h, t]) => tree(G, x, z, h, t));
  // 건물 주변·주차장 가로수
  for (let i = 0; i < 7; i++) tree(G, -1 + i * 5.2, -27.6, 6.0, i % 3);
  for (let i = 0; i < 6; i++) tree(G, -9.5, -20 + i * 8, 6.0, (i + 1) % 3);
  for (let i = 0; i < 5; i++) tree(G, 37.5, -6 + i * 8, 6.0, i % 2);
  for (let i = 0; i < 10; i++) tree(G, 18 + i * 14, -32.5, 6.5, i % 3);   // 도로변 가로수
  for (let i = 0; i < 8; i++) tree(G, 20 + i * 16, -80.5, 6.0, (i + 2) % 3); // 강변 산책로변

  return G;
}

/* =============================================================================
 *  씬 구성
 * ========================================================================== */
function buildScene(renderer) {
  buildMaterials();
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xdae3e6, 230, 540);

  // 환경광 (하늘 그라디언트 → PMREM)
  const eq = makeTex(64, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0.00, '#7fa8d8'); grd.addColorStop(0.45, '#cfe0ee');
    grd.addColorStop(0.55, '#c9c6ba'); grd.addColorStop(1.00, '#7c7a72');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  });
  eq.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(eq).texture;

  // 하늘 돔
  const skyTex = makeTex(32, 512, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0.00, '#5f92cf'); grd.addColorStop(0.34, '#8fb8e0');
    grd.addColorStop(0.49, '#d6e4ee'); grd.addColorStop(0.52, '#dfe6e6');
    grd.addColorStop(1.00, '#cfd6d2');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.globalAlpha = 0.55; g.fillStyle = '#ffffff';        // 옅은 구름 띠
    for (let i = 0; i < 26; i++) {
      const y = 40 + Math.random() * 170;
      g.beginPath(); g.ellipse(Math.random() * w, y, 14 + Math.random() * 12, 3 + Math.random() * 4, 0, 0, 7);
      g.fill();
    }
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(430, 40, 24),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }));
  sky.position.set(20, 0, 11.5); scene.add(sky);

  scene.add(new THREE.HemisphereLight(0xdcecff, 0x6b6a5e, 1.05));
  const sun = new THREE.DirectionalLight(0xfff2dc, 2.6);
  sun.position.set(-70, 95, -55);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const s = 120, c = sun.shadow.camera;
  c.left = -s; c.right = s; c.top = s; c.bottom = -s; c.near = 1; c.far = 400;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  sun.target.position.set(30, 4, 8); scene.add(sun.target); scene.add(sun);

  scene.add(buildSite());
  scene.add(buildContext());
  scene.add(buildGarden());
  scene.add(buildBuilding());
  return scene;
}

/* --- 4방향 조감도 뷰 프리셋 ------------------------------------------------ */
const TARGET = new THREE.Vector3(24, 4, 10);
const VIEWS = {
  front: { name: '정면(35M 도로측) 조감도', pos: [-12, 38, -100], target: [21, 9, 12] },
  back:  { name: '배면 조감도',             pos: [56, 39, 121],   target: [21, 9, 12] },
  left:  { name: '좌측면(정원측) 조감도',   pos: [144, 40, -22],  target: [32, 9, 11] },
  right: { name: '우측면 조감도',           pos: [-95, 38, -25],  target: [16, 9, 11] },
  top:   { name: '상부(배치) 조감도',       pos: [30, 262, 96],   target: [30, 0, -22] },
};

if (typeof window !== 'undefined') { window.buildScene = buildScene; window.VIEWS = VIEWS; window.BSPEC = B; }
