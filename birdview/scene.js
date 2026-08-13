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
      g.fillStyle = i ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.035)';
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
  Object.entries(MAT).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach((m, i) => { m.name = k + i; });
    else v.name = k;
  });
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
 *  대지 · 외부  — 배치도(1/500) 치수체인으로 복원한 실제 필지 형상
 *
 *  배치도 좌표(u:도면 우, v:도면 하, 건물 북서모서리 원점) → 모델 좌표
 *      X = 34.5 - v ,  Z = u          (건물 정면 = Z=0 = 35M 도로측)
 *
 *  치수체인 검증
 *    상단  8,591 | 23,000 | 110,684   → Z=-8.6 · 건물 · 동측 장변 110.7
 *    좌측  10,089 | 34,500 | 10,446   → X=+44.6 · 건물 · X=-10.4
 *    하단  3,961 | 23,000 | 2,136     → Z=-4.0 · 건물 · Z=+25.1
 *
 *  → 전면부는 35M 도로경계에 약 42° 사선인 삼각형, 배면은 110m 장방형 띠(전/답)
 * ========================================================================== */

const SITE = [                     // 대지경계 (4필지 합)
  [44.6,  -8.6],   // 도로경계 교점 (8,591)
  [45.5,  25.1],
  [47.6, 133.7],   // 동측 장변 끝 (110,684)
  [19.4, 133.7],
  [18.4,  25.1],
  [-10.4, 25.1],   // (2,136)
  [-10.4, -4.0],   // (3,961)
  [16.3, -34.5],   // 서측 첨단부
];
const SITE_DEV = [                 // 조성 구역
  [44.6, -8.6], [45.5, 25.1], [46.6, 60.0], [19.0, 60.0], [18.4, 25.1],
  [-10.4, 25.1], [-10.4, -4.0], [16.3, -34.5],
];
const SITE_FARM = [                // 전 / 답 — 조성 제외
  [46.6, 60.0], [47.6, 133.7], [19.4, 133.7], [19.0, 60.0],
];

/* 35M 도로 로컬 좌표계 : 원점 P8, +x = 도로경계 방향, +z = 대지측 */
const ROAD = { org: [16.3, -34.5], rot: -0.7412 };
const RC = Math.cos(ROAD.rot), RS = Math.sin(ROAD.rot);          // 0.737 / -0.675
const L2W = (lx, lz) => [ROAD.org[0] + lx * RC + lz * RS,
                         ROAD.org[1] - lx * RS + lz * RC];

/* 전면 대지경계까지의 Z (X별) — 배치 검토용 */
function frontZ(x) {
  return x <= 16.3 ? -4.0 - 1.142 * (x + 10.4)
                   : -34.5 + 0.915 * (x - 16.3);
}

/* ---------- 폴리곤 지반 ---------------------------------------------------- */
function polyGround(parent, mat, pts, y, tileScale) {
  const sh = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], -p[1])));
  const g = new THREE.ShapeGeometry(sh);
  g.rotateX(-Math.PI / 2); g.translate(0, y, 0);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tileScale, uv.getY(i) / tileScale);
  const m = mat.clone();
  if (mat.map) { m.map = mat.map.clone(); m.map.needsUpdate = true; }
  const mesh = new THREE.Mesh(g, m);
  mesh.receiveShadow = true; parent.add(mesh);
  return mesh;
}
function polyEdge(parent, mat, pts, y, w) {
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
    const m = new THREE.Mesh(new THREE.BoxGeometry(L, 0.05, w), mat);
    m.position.set((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2);
    m.rotation.y = Math.atan2(-dz, dx);
    parent.add(m);
  }
}

/* ---------- 수목 ----------------------------------------------------------- */
function tree(G, x, z, h = 6, type = 0, rnd = Math.random) {
  const t = new THREE.Group();
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.035, h * 0.06, h * 0.45, 8), MAT.trunk);
  tr.position.y = h * 0.225; tr.castShadow = true; t.add(tr);
  if (type === 2) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(h * 0.26, h * 0.8, 10), MAT.leaf2);
    c.position.y = h * 0.62; c.castShadow = true; t.add(c);
  } else {
    const m = type === 1 ? MAT.leaf3 : MAT.leaf1;
    [[0, 0.62, 0, 1.0], [0.3, 0.78, 0.15, 0.72], [-0.28, 0.72, -0.2, 0.66]].forEach(([dx, dy, dz, s]) => {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(h * 0.26 * s, 1), m);
      b.position.set(dx * h * 0.3, h * dy, dz * h * 0.3);
      b.castShadow = true; t.add(b);
    });
  }
  t.position.set(x, 0, z); t.rotation.y = rnd() * 3;
  G.add(t);
}

/* ---------- 주차구획 · 차량 ------------------------------------------------ */
// 'x' : 구획이 X방향으로 나열 (차량은 Z방향 주차)
function stalls(G, n, x0, z0, dir, w = 2.5, d = 5.0) {
  const t = 0.12;
  for (let i = 0; i <= n; i++) {
    if (dir === 'x') box(G, MAT.line, x0 + i * w, x0 + i * w + t, 0.005, 0.02, z0, z0 + d, 0);
    else             box(G, MAT.line, x0, x0 + d, 0.005, 0.02, z0 + i * w, z0 + i * w + t, 0);
  }
  if (dir === 'x') box(G, MAT.line, x0, x0 + n * w + t, 0.005, 0.02, z0 + d - t, z0 + d, 0);
  else             box(G, MAT.line, x0 + d - t, x0 + d, 0.005, 0.02, z0, z0 + n * w + t, 0);
}
function car(G, x, z, rot, ci) {
  const c = new THREE.Group();
  box(c, MAT.car[ci % 5], -0.85, 0.85, 0.25, 0.95, -2.2, 2.2, 0);
  box(c, MAT.glassW, -0.78, 0.78, 0.95, 1.42, -0.9, 1.1, 0);
  [[-0.88, -1.5], [0.88, -1.5], [-0.88, 1.5], [0.88, 1.5]].forEach(([wx, wz]) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 14),
      Object.assign(new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: .9 }), { name: 'tyre' }));
    t.rotation.z = Math.PI / 2; t.position.set(wx, 0.32, wz); t.castShadow = true; c.add(t);
  });
  c.position.set(x, 0, z); c.rotation.y = rot; G.add(c);
}

/* =============================================================================
 *  대지 · 도로 · 주차
 * ========================================================================== */
function buildSite() {
  const G = new THREE.Group(); G.name = '대지';

  /* --- 주변 지반 ---------------------------------------------------------- */
  const fieldTex = makeTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8f9679'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16000; i++) {
      const v = Math.random() * 34;
      g.fillStyle = `rgba(${132 + v},${140 + v},${104 + v},0.35)`;
      g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
  });
  const field = new THREE.MeshStandardMaterial({ map: fieldTex, roughness: 1.0 });
  field.name = 'field';
  field.map.repeat.set(200, 160);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3200, 2600), field);
  ground.rotation.x = -Math.PI / 2; ground.position.set(40, -0.34, 20);
  ground.receiveShadow = true; G.add(ground);

  /* --- 전 / 답 (조성 제외) ------------------------------------------------ */
  const farmTex = makeTex(256, 256, (g, w, h) => {
    g.fillStyle = '#7e8461'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
      g.fillRect(0, i * h / 8, w, h / 16);
    }
    for (let i = 0; i < 12000; i++) {
      const v = Math.random() * 30;
      g.fillStyle = `rgba(${118 + v},${128 + v},${88 + v},0.30)`;
      g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
  });
  const farmM = new THREE.MeshStandardMaterial({ map: farmTex, roughness: 1 }); farmM.name = 'farm';
  polyGround(G, farmM, SITE_FARM, -0.12, 9);

  /* --- 조성 구역 : 포장 → 녹지 순으로 깔고 하드스케이프를 위에 얹음 -------- */
  polyGround(G, MAT.paving, SITE_DEV, -0.06, 2.0);
  // 전면 삼각 녹지 (도로경계 기준 정형)
  polyGround(G, MAT.lawn, [L2W(1.6, 1.6), L2W(38.2, 1.6), L2W(38.2, 13.0),
                           L2W(24.0, 13.5), L2W(20.0, 21.0), L2W(3.0, 21.0)], -0.02, 6.0);
  polyGround(G, MAT.lawn, [[38.5, -11.5], [44.4, -8.9], [45.3, 24.9], [38.5, 24.9]], -0.02, 6.0); // 북측 녹지
  polyGround(G, MAT.lawn, [[-10.2, -3.6], [-9.6, 24.9], [-10.2, 24.9]], -0.02, 6.0);
  polyGround(G, MAT.lawn, [[19.2, 46.0], [46.4, 46.0], [46.5, 59.8], [19.1, 59.8]], -0.02, 6.0); // 후면 녹지

  /* --- 대지경계선 --------------------------------------------------------- */
  const edgeM = new THREE.MeshStandardMaterial({ color: 0x2b3134, roughness: 0.9 }); edgeM.name = 'edge';
  polyEdge(G, edgeM, SITE, 0.04, 0.24);

  /* =====================  35M 도로 · 강변로 · 경포천  ===================== */
  const R = new THREE.Group();
  R.position.set(ROAD.org[0], 0, ROAD.org[1]);
  R.rotation.y = ROAD.rot;
  const rs = (x0, x1, z0, z1, mat, y, tile) => slab(R, mat, x0, x1, z0, z1, y, tile);

  rs(-120, 220, -4.5, 0.3, MAT.paving, 0.10, 2.0);      // 대지측 보도
  rs(-120, 220, -39.5, -4.5, MAT.asphalt, 0.02, 6.0);   // 차도 35M
  rs(-120, 220, -44.0, -39.5, MAT.paving, 0.10, 2.0);   // 건너편 보도
  for (let x = -118; x < 218; x += 6)
    box(R, MAT.line, x, x + 3.4, 0.025, 0.04, -22.2, -21.8, 0);          // 중앙선
  for (let x = -118; x < 218; x += 8)
    [-31, -13].forEach(z => box(R, MAT.line, x, x + 4, 0.025, 0.04, z, z + 0.16, 0));
  [[6, 14], [28, 36]].forEach(([a, b]) => rs(a, b, -5.4, 0.4, MAT.asphalt, 0.11, 5.0)); // 진·출입구

  // 도로변 인접 상가 (달빛에구운고등어 · 타이어프로 위치)
  const panelM = new THREE.MeshStandardMaterial({ color: 0xd8d6d0, roughness: 0.7 }); panelM.name = 'panel';
  const roofMt = new THREE.MeshStandardMaterial({ color: 0x4c5157, roughness: 0.6, metalness: 0.4 }); roofMt.name = 'roofMt';
  [[48, 64, 5, 20, 4.6], [70, 90, 4, 18, 4.2]].forEach(([a, b, c, d, h]) => {
    box(R, panelM, a, b, 0, h, c, d, 0);
    box(R, roofMt, a - 0.3, b + 0.3, h, h + 0.35, c - 0.3, d + 0.3, 0);
    box(R, MAT.glassW, a + 0.6, b - 0.6, 0.6, h - 0.9, c - 0.12, c + 0.02, 0);
  });
  rs(44, 96, 0.5, 5.0, MAT.asphalt, 0.0, 5.0);          // 상가 전면 주차
  for (let i = 0; i < 12; i++) box(R, MAT.line, 46 + i * 3.4, 46.1 + i * 3.4, 0.025, 0.04, 0.6, 4.6, 0);
  for (let i = 0; i < 22; i++) { const lx = -110 + i * 16;
    if (lx > -6 && lx < 44) continue; tree(R, lx, -2.1, 6.0, (i + 1) % 3); }
  G.add(R);

  /* ===============  경포천 (대지 서측, 남북 방향) + 강변로 · 산책로  ======= */
  const S = new THREE.Group();
  S.position.set(-15.5, 0, -66.3);
  S.rotation.y = 0.7854;                                 // 로컬 +x = 정북
  const ss = (x0, x1, z0, z1, mat, y, tile) => slab(S, mat, x0, x1, z0, z1, y, tile);
  ss(-180, 180, 13, 27, MAT.lawn, -0.02, 6.0);           // 동측 둔치
  ss(-180, 180, -27, -13, MAT.lawn, -0.02, 6.0);         // 서측 둔치
  ss(-180, 180, 15.5, 18.5, MAT.paving, 0.08, 2.0);      // 산책로 (동안)
  ss(-180, 180, 27, 40, MAT.asphalt, 0.02, 6.0);         // 강변로 (하포로)
  ss(-180, 180, -40, -27, MAT.asphalt, 0.02, 6.0);       // 서측 도로
  ss(-180, 180, 12.4, 13.4, MAT.stone, 0.10, 2.0);       // 호안
  ss(-180, 180, -13.4, -12.4, MAT.stone, 0.10, 2.0);
  const stream = new THREE.Mesh(new THREE.PlaneGeometry(360, 25), MAT.water);
  stream.rotation.x = -Math.PI / 2; stream.position.set(0, -0.20, 0);
  stream.receiveShadow = true; S.add(stream);
  for (let i = 0; i < 20; i++) tree(S, -150 + i * 16, 22.0, 6.2, i % 3);
  for (let i = 0; i < 16; i++) tree(S, -140 + i * 18, -22.0, 6.2, (i + 1) % 3);
  G.add(S);

  /* =====================  구내 동선 (아스팔트)  =========================== */
  slab(G, MAT.asphalt, 31.5, 36.5, -13.5, 25.0, 0.0, 5.0);   // 동측 진입로
  slab(G, MAT.asphalt, -3.0, 2.0, -13.5, 24.5, 0.0, 5.0);    // 서측 순환로
  slab(G, MAT.asphalt, -3.0, 36.5, -13.5, -9.0, 0.0, 5.0);   // 전면 연결로
  slab(G, MAT.asphalt, -3.0, 36.5, 20.0, 24.5, 0.0, 5.0);    // 후면 연결로
  slab(G, MAT.asphalt, 20.0, 25.0, 24.0, 31.0, 0.0, 5.0);    // 후면 주차 진입

  /* =====================  주차 22면 (배치도 3개소)  ======================= */
  // ① 서측 6면
  slab(G, MAT.asphalt, -9.5, -3.0, 1.0, 17.0, 0.0, 5.0);
  stalls(G, 6, -8.5, 1.5, 'z');
  [0, 2, 4].forEach((i, k) => car(G, -6.0, 3.75 + i * 2.5, Math.PI / 2, k));
  // ② 전면 6면 (배치도 : 정면 좌측)
  slab(G, MAT.asphalt, 5.0, 20.5, -18.5, -12.5, 0.0, 5.0);
  stalls(G, 6, 5.6, -18.0, 'x');
  [0, 1, 3, 5].forEach((i, k) => car(G, 6.85 + i * 2.5, -15.5, 0, k + 1));
  // ③ 후면 8면
  slab(G, MAT.asphalt, 19.5, 37.0, 30.0, 42.0, 0.0, 5.0);
  stalls(G, 4, 20.5, 30.6, 'x');  stalls(G, 4, 20.5, 36.4, 'x');
  [0, 2].forEach((i, k) => car(G, 21.75 + i * 2.5, 33.1, 0, k));
  [1, 3].forEach((i, k) => car(G, 21.75 + i * 2.5, 38.9, 0, k + 3));
  // 장애인 2면 (주출입 인접)
  slab(G, MAT.asphalt, 11.5, 18.0, -8.5, -3.0, 0.0, 5.0);
  [12.0, 14.9].forEach((x) => {
    box(G, MAT.line, x, x + 2.8, 0.005, 0.02, -8.0, -3.4, 0);
    box(G, Object.assign(new THREE.MeshStandardMaterial({ color: 0x2f5fa8, roughness: .9 }), { name: 'bluepaint' }),
        x + 0.15, x + 2.65, 0.02, 0.03, -7.85, -3.55, 0);
  });

  /* --- 광장 · 보행 ---------------------------------------------------------- */
  slab(G, MAT.paving, 19.0, 30.0, -9.5, -0.2, 0.06, 1.2);    // 주출입 광장 · 드롭오프
  slab(G, MAT.paving, 34.0, 39.5, -6.0, 24.0, 0.05, 1.2);    // 발인 동선 (좌측면 출입)
  slab(G, MAT.paving, 2.0, 19.0, -2.5, -0.2, 0.05, 1.2);     // 정면 보행로

  /* --- 경계 식재대 · 가로수 ------------------------------------------------- */
  for (let i = 0; i < 9; i++) box(G, MAT.hedge, 37.6, 38.8, 0, 0.8, -6.0 + i * 3.0, -4.9 + i * 3.0, 0);
  for (let i = 0; i < 8; i++) box(G, MAT.hedge, -2.0 + i * 3.0, -0.9 + i * 3.0, 0, 0.8, 24.8, 26.0, 0);
  for (let i = 0; i < 5; i++) tree(G, 42.0, -4.0 + i * 6.5, 6.4, i % 3);
  for (let i = 0; i < 4; i++) tree(G, -6.5, 20.0 + i * 0.1, 6.2, i % 3);
  for (let i = 0; i < 5; i++) tree(G, 22.0 + i * 6.0, 47.5, 6.4, i % 3);
  for (let i = 0; i < 4; i++) tree(G, 44.0, 30.0 + i * 8.0, 6.4, (i + 1) % 3);
  return G;
}

/* --- 원경 수목대 ----------------------------------------------------------- */
function buildContext() {
  const G = new THREE.Group(); G.name = '원경';
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const belt = (x0, x1, z0, z1, n, hmin, hmax) => {
    for (let i = 0; i < n; i++)
      tree(G, x0 + rnd() * (x1 - x0), z0 + rnd() * (z1 - z0),
           hmin + rnd() * (hmax - hmin), Math.floor(rnd() * 3), rnd);
  };
  belt(-130, -30, -50, 130, 26, 6, 11);
  belt(58, 150, -10, 150, 28, 6, 11);
  belt(-60, 160, 150, 215, 28, 6, 11);
  return G;
}

/* =============================================================================
 *  조경 — 정적인 물가가 있는 호텔형 전면 정원 (35M 도로에 정렬)
 * ========================================================================== */
function buildGarden() {
  const G = new THREE.Group(); G.name = '정원';

  /* 도로경계에 정렬된 정원 로컬 프레임 */
  const P = new THREE.Group();
  P.position.set(ROAD.org[0], 0, ROAD.org[1]);
  P.rotation.y = ROAD.rot;
  G.add(P);

  /* --- 정적 수경 (반사 연못 18.0 × 5.0) ----------------------------------- */
  const x0 = 4.0, x1 = 22.0, z0 = 5.0, z1 = 10.0;
  bandFrame(P, MAT.stone, x0 - 0.9, x1 + 0.9, -0.06, 0.24, z0 - 0.9, z1 + 0.9, 0.9);
  box(P, MAT.soil, x0, x1, -0.5, 0.06, z0, z1, 0);
  const w = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), MAT.water);
  w.rotation.x = -Math.PI / 2; w.position.set((x0 + x1) / 2, 0.11, (z0 + z1) / 2);
  w.receiveShadow = true; P.add(w);
  for (let i = 0; i < 7; i++)                                     // 디딤석
    box(P, MAT.stone, x0 + 1.4 + i * 2.3, x0 + 2.7 + i * 2.3, 0.08, 0.22, 6.8, 8.2, 0);

  /* --- 정형 관목 열 · 산책 동선 ------------------------------------------- */
  for (let i = 0; i < 9; i++) {
    box(P, MAT.hedge, x0 + i * 2.0, x0 + 1.4 + i * 2.0, 0, 0.6, z0 - 2.9, z0 - 1.8, 0);
    box(P, MAT.hedge, x0 + i * 2.0, x0 + 1.4 + i * 2.0, 0, 0.6, z1 + 1.8, z1 + 2.9, 0);
  }
  slab(P, MAT.paving, 2.0, 34.0, 2.2, 4.2, 0.05, 1.5);            // 도로변 산책로
  slab(P, MAT.paving, 2.0, 34.0, 13.4, 15.4, 0.05, 1.5);          // 내측 산책로
  slab(P, MAT.paving, 2.0, 4.0, 4.2, 15.4, 0.05, 1.5);
  slab(P, MAT.paving, 23.5, 25.5, 4.2, 15.4, 0.05, 1.5);

  /* --- 파고라 (수경 축 끝) ------------------------------------------------- */
  const pg = new THREE.Group();
  for (const dx of [-2.6, 2.6]) for (const dz of [-2.0, 2.0])
    box(pg, MAT.wood, dx - 0.15, dx + 0.15, 0, 2.9, dz - 0.15, dz + 0.15, 0);
  box(pg, MAT.wood, -3.0, 3.0, 2.9, 3.12, -2.4, -2.1, 0);
  box(pg, MAT.wood, -3.0, 3.0, 2.9, 3.12, 2.1, 2.4, 0);
  for (let i = 0; i <= 8; i++) box(pg, MAT.wood, -2.8 + i * 0.67, -2.54 + i * 0.67, 3.12, 3.28, -2.4, 2.4, 0);
  box(pg, MAT.paving, -3.6, 3.6, -0.02, 0.06, -3.0, 3.0, 1.2);
  pg.position.set(30.0, 0, 8.0); P.add(pg);

  /* --- 기억의 정원 : 표지석 · 자갈마당 · 경석 ------------------------------ */
  box(P, MAT.stone, 1.6, 2.2, 0, 1.9, 12.6, 15.2, 0);            // 표지석 (기억의 정원)
  const gravel = new THREE.MeshStandardMaterial({ color: 0xd4d0c6, roughness: 1 });
  gravel.name = 'gravel';
  slab(P, gravel, 4.0, 22.0, 11.8, 13.4, 0.04, 1.0);             // 자갈 마당
  slab(P, gravel, 4.0, 22.0, 1.6, 3.2, 0.04, 1.0);
  const moss = new THREE.MeshStandardMaterial({ color: 0x4f6b3a, roughness: 1 });
  moss.name = 'moss';
  [[6.5, 12.4], [12.0, 12.9], [17.5, 12.3], [8.0, 2.4], [14.5, 2.6], [19.5, 2.5]]
    .forEach(([x, z]) => {
      const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), MAT.stone);
      r.position.set(x, 0.22, z); r.scale.set(1.5, 0.55, 1.1);
      r.castShadow = true; r.receiveShadow = true; P.add(r);
      const m = new THREE.Mesh(new THREE.CircleGeometry(1.5, 16), moss);
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.05, z); m.receiveShadow = true; P.add(m);
    });

  /* --- 수목 (도로경계 정렬 대칭 식재) ------------------------------------- */
  for (let i = 0; i < 4; i++) tree(P, 5.5 + i * 6.4, 0.6, 5.0, i % 2);      // 도로변 열식
  for (let i = 0; i < 4; i++) tree(P, 6.0 + i * 5.6, 17.4, 5.4, (i + 1) % 2);
  [[2.6, 12.0, 6.6, 2], [2.6, 6.5, 6.6, 2], [24.6, 12.2, 6.4, 2], [24.6, 6.5, 6.4, 2],
   [33.0, 3.0, 6.0, 0], [33.5, 13.5, 6.0, 1], [13.0, 19.5, 5.6, 1], [21.0, 19.0, 5.6, 0]]
    .forEach(([x, z, h, t]) => tree(P, x, z, h, t));
  return G;
}

/* =============================================================================
 *  주변 확경 (위성사진 기준) — 배드민턴장 · 인접 상가 · 농경지
 * ========================================================================== */
function buildNeighborhood() {
  const G = new THREE.Group(); G.name = '확경';

  /* --- 배드민턴장 (대지 동측, 위성사진 위치) ------------------------------ */
  const court = new THREE.MeshStandardMaterial({ color: 0x2f6b4a, roughness: 0.95 });
  court.name = 'court';
  const courtEdge = new THREE.MeshStandardMaterial({ color: 0x9fb0a3, roughness: 0.95 });
  courtEdge.name = 'courtEdge';
  slab(G, courtEdge, 24.0, 48.0, 72.0, 108.0, -0.02, 4.0);
  slab(G, court, 25.5, 46.5, 73.5, 106.5, 0.0, 4.0);
  // 코트 라인 3면
  for (let c = 0; c < 3; c++) {
    const z = 75.5 + c * 10.6;                       // 코트 13.4 x 6.1 (배드민턴 규격)
    const x = 29.0;
    [[x, x + 13.4, z, z + 0.1], [x, x + 13.4, z + 6.1, z + 6.2],
     [x, x + 0.1, z, z + 6.2], [x + 13.4, x + 13.5, z, z + 6.2],
     [x + 6.65, x + 6.75, z, z + 6.2]].forEach(([a, b, c0, c1]) =>
      box(G, MAT.line, a, b, 0.005, 0.02, c0, c1, 0));
    box(G, MAT.metal, x + 6.6, x + 6.8, 0.02, 1.55, z - 0.3, z + 6.5, 0);   // 네트
  }
  // 펜스
  for (let i = 0; i <= 12; i++) box(G, MAT.metal, 24.2 + i * 2.0, 24.35 + i * 2.0, 0, 3.6, 72.2, 72.35, 0);
  for (let i = 0; i <= 12; i++) box(G, MAT.metal, 24.2 + i * 2.0, 24.35 + i * 2.0, 0, 3.6, 107.7, 107.85, 0);
  for (let i = 0; i <= 18; i++) box(G, MAT.metal, 24.2, 24.35, 0, 3.6, 72.2 + i * 2.0, 72.35 + i * 2.0, 0);
  for (let i = 0; i <= 18; i++) box(G, MAT.metal, 47.7, 47.85, 0, 3.6, 72.2 + i * 2.0, 72.35 + i * 2.0, 0);
  box(G, MAT.metal, 24.2, 47.85, 3.5, 3.62, 72.2, 72.35, 0);
  box(G, MAT.metal, 24.2, 47.85, 3.5, 3.62, 107.7, 107.85, 0);
  for (let i = 0; i < 4; i++) tree(G, 51.0, 75.0 + i * 10.0, 6.4, i % 3);

  /* --- 농경지 이랑 (동측 원경) -------------------------------------------- */
  const soilM = new THREE.MeshStandardMaterial({ color: 0x8a7f66, roughness: 1 });
  soilM.name = 'soilM';
  slab(G, soilM, 96, 190, -30, 90, -0.08, 3.0);
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
  scene.add(buildNeighborhood());
  scene.add(buildContext());
  scene.add(buildGarden());
  scene.add(buildBuilding());
  return scene;
}

/* --- 4방향 조감도 뷰 프리셋 ------------------------------------------------ */
const TARGET = new THREE.Vector3(24, 4, 10);
const VIEWS = {
  front: { name: '정면(35M 도로측) 조감도', pos: [-14, 40, -120], target: [19, 9, -4] },
  back:  { name: '배면 조감도',             pos: [52, 41, 132],   target: [19, 9, 16] },
  left:  { name: '좌측면 조감도',           pos: [128, 40, 58],   target: [24, 9, 14] },
  right: { name: '우측면 조감도',           pos: [-100, 40, -28], target: [13, 9, 6] },
  top:   { name: '상부(배치) 조감도',       pos: [26, 250, 104],  target: [26, 0, -16] },
};

function exportScene(scene) {
  const out = [];
  scene.traverse(o => {
    if (!o.isMesh) return;
    o.updateWorldMatrix(true, false);
    const g = o.geometry, p = g.parameters || {};
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    const rec = { mat: mat.name || 'default', m: o.matrixWorld.elements.slice(),
                  color: '#' + mat.color.getHexString() };
    if (g.type === 'BoxGeometry') { rec.t = 'box'; rec.s = [p.width, p.height, p.depth]; }
    else if (g.type === 'PlaneGeometry') { rec.t = 'plane'; rec.s = [p.width, p.height]; }
    else if (g.type === 'CylinderGeometry') { rec.t = 'cyl'; rec.s = [p.radiusTop, p.radiusBottom, p.height]; }
    else if (g.type === 'ConeGeometry') { rec.t = 'cone'; rec.s = [p.radius, p.height]; }
    else if (g.type === 'IcosahedronGeometry') { rec.t = 'ico'; rec.s = [p.radius]; }
    else if (g.type === 'CircleGeometry') { rec.t = 'circle'; rec.s = [p.radius]; }
    else if (g.type === 'SphereGeometry') { return; }                       // 하늘돔 제외
    else { rec.t = 'mesh';
      rec.v = Array.from(g.attributes.position.array);
      rec.i = g.index ? Array.from(g.index.array) : null; }
    out.push(rec);
  });
  return out;
}
if (typeof window !== 'undefined') {
  window.buildScene = buildScene; window.VIEWS = VIEWS; window.BSPEC = B;
  window.exportScene = exportScene;
}
