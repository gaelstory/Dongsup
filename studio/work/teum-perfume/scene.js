/* 틈 TEUM — the glass bottle. Reads window.TEUM.state (written by main.js) and draws one frame per rAF. */
import * as THREE from '../../assets/vendor/three/three.module.min.js';

const TEUM = window.TEUM;
const canvas = document.getElementById('glass');

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

if (TEUM && canvas && webglAvailable()) {
  try { init(); } catch (err) { canvas.remove(); }
}

function init() {
  const isPhone = Math.min(screen.width, screen.height) < 600 || matchMedia('(max-width: 599px)').matches;
  const reduced = () => TEUM.reduced();
  const SRGB = THREE.SRGBColorSpace;
  const TAU = Math.PI * 2;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, isPhone ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGB;
  renderer.transmissionResolutionScale = isPhone ? 0.6 : 1;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color().setRGB(0.91, 0.9, 0.886, SRGB);
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 60);
  const DIST = 9, CAMY = 2.05;
  camera.position.set(0, CAMY, DIST);

  /* ---------- environment: 1024x512 canvas -> equirect -> PMREM ---------- */
  const envCanvas = document.createElement('canvas');
  envCanvas.width = 1024; envCanvas.height = 512;
  const eg = envCanvas.getContext('2d');
  function drawEnv(blob) {
    const W = 1024, H = 512;
    const grad = eg.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#f4f2ee');
    grad.addColorStop(0.46, '#dcd8d2');
    grad.addColorStop(0.52, '#a9a59f');
    grad.addColorStop(1, '#3c3a37');
    eg.fillStyle = grad; eg.fillRect(0, 0, W, H);
    // scent-coloured glow, low on the horizon, so the bottle edges pick up the scent
    const bx = W * 0.75, by = H * 0.56;
    const rg = eg.createRadialGradient(bx, by, 0, bx, by, W * 0.2);
    rg.addColorStop(0, blob); rg.addColorStop(1, 'rgba(0,0,0,0)');
    eg.globalAlpha = 0.85; eg.fillStyle = rg; eg.fillRect(0, 0, W, H);
    const rg2 = eg.createRadialGradient(W * 0.25, by, 0, W * 0.25, by, W * 0.16);
    rg2.addColorStop(0, blob); rg2.addColorStop(1, 'rgba(0,0,0,0)');
    eg.globalAlpha = 0.55; eg.fillStyle = rg2; eg.fillRect(0, 0, W, H);
    eg.globalAlpha = 1;
    // three white softboxes; their reflections are the vertical highlights on the glass
    const strips = [[0.62, 0.038, 0.16, 0.66], [0.80, 0.022, 0.1, 0.62], [0.95, 0.05, 0.2, 0.6]];
    for (const [u, w, v0, v1] of strips) {
      const x = u * W, ww = w * W;
      const lg = eg.createLinearGradient(x - ww, 0, x + ww, 0);
      lg.addColorStop(0, 'rgba(255,255,255,0)');
      lg.addColorStop(0.3, '#ffffff'); lg.addColorStop(0.7, '#ffffff');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      eg.fillStyle = lg; eg.fillRect(x - ww, v0 * H, ww * 2, (v1 - v0) * H);
    }
    // a soft top light
    const tg = eg.createLinearGradient(0, 0, 0, H * 0.12);
    tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, 'rgba(255,255,255,0)');
    eg.fillStyle = tg; eg.fillRect(0, 0, W, H * 0.12);
  }
  const envTex = new THREE.CanvasTexture(envCanvas);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  envTex.colorSpace = SRGB;
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null;
  let envBlob = '';
  function updateEnv(rgb) {
    const c = 'rgb(' + Math.round(rgb[0] * 255) + ',' + Math.round(rgb[1] * 255) + ',' + Math.round(rgb[2] * 255) + ')';
    if (c === envBlob) return false;
    envBlob = c;
    drawEnv(c);
    envTex.needsUpdate = true;
    envRT = pmrem.fromEquirectangular(envTex, envRT);
    scene.environment = envRT.texture;
    return true;
  }

  /* ---------- the big 틈 behind the bottle (opaque so the glass refracts it) ---------- */
  const glyphCanvas = document.createElement('canvas');
  glyphCanvas.width = 1024; glyphCanvas.height = 1024;
  const gg = glyphCanvas.getContext('2d');
  function drawGlyph() {
    gg.clearRect(0, 0, 1024, 1024);
    gg.fillStyle = '#fff';
    gg.font = '600 860px "Noto Serif KR", "Nanum Myeongjo", serif';
    gg.textAlign = 'center';
    gg.textBaseline = 'alphabetic';
    const m = gg.measureText('틈');
    const asc = m.actualBoundingBoxAscent || 700, desc = m.actualBoundingBoxDescent || 80;
    // sit the glyph so its ink box is centred in the canvas
    gg.fillText('틈', 512, 512 + (asc - desc) / 2);
    inkFrac = Math.min(0.98, (asc + desc) / 1024);
  }
  let inkFrac = 0.8;
  drawGlyph();
  const glyphTex = new THREE.CanvasTexture(glyphCanvas);
  glyphTex.anisotropy = 4;
  const inkShader = {
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform sampler2D map; uniform vec3 bg; uniform vec3 ink; uniform float amt; varying vec2 vUv;' +
      'void main(){ float a = texture2D(map, vUv).a * amt; gl_FragColor = vec4(mix(bg, ink, a), 1.0);\n#include <colorspace_fragment>\n}',
    toneMapped: false
  };
  const glyphMat = new THREE.ShaderMaterial(Object.assign({
    uniforms: { map: { value: glyphTex }, bg: { value: new THREE.Color() }, ink: { value: new THREE.Color() }, amt: { value: 1 } }
  }, inkShader));
  // the horizon is drawn here, not in the DOM, so the glass bends it like everything else behind the bottle
  const lineCanvas = document.createElement('canvas');
  lineCanvas.width = 4; lineCanvas.height = 4;
  const lc = lineCanvas.getContext('2d'); lc.fillStyle = '#fff'; lc.fillRect(0, 0, 4, 4);
  const lineMat = new THREE.ShaderMaterial(Object.assign({
    uniforms: { map: { value: new THREE.CanvasTexture(lineCanvas) }, bg: glyphMat.uniforms.bg, ink: { value: new THREE.Color() }, amt: { value: 0.5 } }
  }, inkShader));
  const line = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), lineMat);
  line.position.z = -1.9;
  scene.add(line);
  const glyph = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glyphMat);
  glyph.position.z = -1.9;
  scene.add(glyph);

  /* ---------- bottle ---------- */
  const V2 = THREE.Vector2;
  const body = [];
  body.push(new V2(0.0001, 0));
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2);
    body.push(new V2(0.56 + 0.06 * Math.cos(a), 0.06 + 0.06 * Math.sin(a)));
  }
  body.push(new V2(0.62, 1.28));
  const bez = (p0, p1, p2, p3, t) => {
    const u = 1 - t;
    return new V2(
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]);
  };
  for (let i = 1; i <= 16; i++) body.push(bez([0.62, 1.28], [0.62, 1.6], [0.46, 1.68], [0.2, 1.69], i / 16));
  body.push(new V2(0.2, 1.7));
  body.push(new V2(0.0001, 1.7));
  const glassGeo = new THREE.LatheGeometry(body, isPhone ? 72 : 112);

  const liquidPts = [new V2(0.0001, 0.16)];
  for (let i = 0; i <= 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
    liquidPts.push(new V2(0.5 + 0.045 * Math.cos(a), 0.205 + 0.045 * Math.sin(a)));
  }
  liquidPts.push(new V2(0.545, 1.35));
  liquidPts.push(new V2(0.0001, 1.35));
  const liquidGeo = new THREE.LatheGeometry(liquidPts, isPhone ? 56 : 88);

  const capPts = [new V2(0.0001, 0), new V2(0.29, 0), new V2(0.3, 0.012)];
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    capPts.push(new V2(0.27 + 0.03 * Math.cos(a), 0.5 + 0.03 * Math.sin(a)));
  }
  capPts.push(new V2(0.0001, 0.53));
  const capGeo = new THREE.LatheGeometry(capPts, 64);

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.04, transmission: 1, thickness: 1.2, ior: 1.5,
    clearcoat: 1, clearcoatRoughness: 0.04, attenuationColor: new THREE.Color(), attenuationDistance: 0.9,
    envMapIntensity: 2.6, specularIntensity: 1
  });
  const liquidMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.1, transmission: 1, thickness: 1.1, ior: 1.36,
    attenuationColor: new THREE.Color(), attenuationDistance: 1.15, side: THREE.DoubleSide, envMapIntensity: 1.4
  });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x121212, roughness: 0.5, metalness: 0, envMapIntensity: 0.9 });
  const collarMat = new THREE.MeshStandardMaterial({ color: 0xcfc9bf, roughness: 0.22, metalness: 1, envMapIntensity: 1.2 });

  const tilt = new THREE.Group();
  tilt.position.y = 1.1;
  const spin = new THREE.Group();
  spin.position.y = -1.1;
  tilt.add(spin);
  const holder = new THREE.Group();
  holder.add(tilt);
  scene.add(holder);

  const liquid = new THREE.Mesh(liquidGeo, liquidMat); liquid.renderOrder = 1; spin.add(liquid);
  const glass = new THREE.Mesh(glassGeo, glassMat); glass.renderOrder = 2; spin.add(glass);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.232, 0.232, 0.07, 64), collarMat);
  collar.position.y = 1.735; spin.add(collar);
  const cap = new THREE.Mesh(capGeo, capMat); cap.position.y = 1.77; spin.add(cap);

  // label: a curved strip of vellum, printed per scent
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 768; labelCanvas.height = 432;
  const lg = labelCanvas.getContext('2d');
  let labelDrawn = -1;
  function drawLabel(i) {
    const s = TEUM.scents[i], W = 768, H = 432;
    lg.clearRect(0, 0, W, H);
    lg.fillStyle = 'rgba(250,250,248,0.95)';
    lg.fillRect(0, 0, W, H);
    lg.strokeStyle = 'rgba(23,23,23,0.28)'; lg.lineWidth = 2;
    lg.strokeRect(18, 18, W - 36, H - 36);
    lg.fillStyle = '#171717'; lg.textAlign = 'center'; lg.textBaseline = 'alphabetic';
    lg.font = '600 112px "Noto Serif KR", serif';
    lg.fillText('틈', W / 2, 158);
    lg.font = '300 34px "Jost", sans-serif';
    if ('letterSpacing' in lg) lg.letterSpacing = '14px';
    lg.fillText('TEUM', W / 2 + 7, 214);
    if ('letterSpacing' in lg) lg.letterSpacing = '0px';
    lg.fillStyle = s.hex; lg.fillRect(W / 2 - 40, 244, 80, 3);
    lg.fillStyle = '#171717';
    lg.font = '400 50px "Noto Serif KR", serif';
    lg.fillText(s.no + ' ' + s.name, W / 2, 322);
    lg.font = '300 28px "Jost", sans-serif';
    lg.fillStyle = 'rgba(23,23,23,0.7)';
    lg.fillText('eau de parfum  50 ml', W / 2, 378);
    labelTex.needsUpdate = true;
    labelDrawn = i;
  }
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.colorSpace = SRGB;
  labelTex.anisotropy = 4;
  const labelMat = new THREE.MeshStandardMaterial({ map: labelTex, transparent: true, roughness: 0.75, metalness: 0, envMapIntensity: 1.1 });
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.633, 0.633, 0.4, 48, 1, true, -0.6, 1.2), labelMat);
  label.position.y = 0.7;
  label.renderOrder = 3;
  spin.add(label);

  // contact shadow
  const shCanvas = document.createElement('canvas');
  shCanvas.width = 256; shCanvas.height = 256;
  const sg = shCanvas.getContext('2d');
  const sgr = sg.createRadialGradient(128, 128, 0, 128, 128, 128);
  sgr.addColorStop(0, 'rgba(0,0,0,1)'); sgr.addColorStop(0.45, 'rgba(0,0,0,0.55)'); sgr.addColorStop(1, 'rgba(0,0,0,0)');
  sg.fillStyle = sgr; sg.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.5),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shCanvas), color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false, toneMapped: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.003;
  holder.add(shadow);

  /* ---------- framing (matches the CSS poster: --base, --bfrac) ---------- */
  let W = 1, H = 1, Vw = 1, Vh = 1;
  function frame() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    renderer.setSize(W, H, false);
    const cs = getComputedStyle(document.documentElement);
    const base = parseFloat(cs.getPropertyValue('--base')) || 0.75;
    const bfrac = parseFloat(cs.getPropertyValue('--bfrac')) || 0.6;
    Vh = 2.3 / bfrac;
    Vw = Vh * (W / H);
    const yTop = base * Vh, yBot = yTop - Vh;
    const near = 0.1, s = near / DIST;
    camera.projectionMatrix.makePerspective(-Vw / 2 * s, Vw / 2 * s, (yTop - CAMY) * s, (yBot - CAMY) * s, near, 60);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    // glyph and horizon live at z=-1.9; place them by where they should land on screen
    const D = DIST + 1.9, kz = D / DIST;
    const hz = base - (W > H ? 0.035 : 0.03);
    const toY = (frac) => CAMY + ((yTop - frac * Vh) - CAMY) * kz;
    line.position.y = toY(hz);
    line.scale.set(Vw * kz * 1.4, Vh * kz / H, 1);
    const gh = W > H ? 0.6 : 0.56;
    let inkH = gh * Vh;
    const maxW = Vw * 0.92;
    if (inkH * 0.9 > maxW) inkH = maxW / 0.9;
    frameInfo.inkH = inkH * kz;
    frameInfo.centerY = toY(hz - (inkH / Vh) / 2);
    frameInfo.hzY = toY(hz);
    frameInfo.kz = kz;
    dirty = true;
  }
  const frameInfo = { inkH: 3, centerY: 1.2, hzY: 0, kz: 1.2 };

  /* ---------- pointer (fine pointers only) ---------- */
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  addEventListener('pointermove', (e) => {
    if (!fine.matches || e.pointerType !== 'mouse') return;
    ptr.tx = (e.clientX / innerWidth) * 2 - 1;
    ptr.ty = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  /* ---------- loop ---------- */
  const tmpA = new THREE.Color();
  const WHITE = new THREE.Color(1, 1, 1);
  let idle = -0.35, restU = -0.35, last = 0, raf = 0, visible = true, dirty = true, ready = false;
  let envTimer = 0, lastSig = '', glyphX = 0, prevX = 0;
  const REST = -0.35;

  function setColor(c, rgb) { c.setRGB(rgb[0], rgb[1], rgb[2], SRGB); }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (!visible) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    const st = TEUM.state;
    const still = reduced() || TEUM.isShot;

    setColor(scene.background, st.bg);
    glyphMat.uniforms.bg.value.copy(scene.background);
    setColor(glyphMat.uniforms.ink.value, st.ink);
    setColor(liquidMat.attenuationColor, st.liquid);
    setColor(tmpA, st.liquid);
    glassMat.attenuationColor.copy(tmpA).lerp(WHITE, 0.42);

    envTimer -= dt;
    if (envTimer <= 0 && updateEnv(st.liquid)) envTimer = 0.16;

    if (st.labelIdx !== labelDrawn) drawLabel(st.labelIdx);

    // rotation: idle turntable in the hero, settling to a front three-quarter view for reading
    const spinOn = !still && !TEUM.spinPaused;
    if (spinOn) idle += dt * 0.15 * st.heroW;
    if (st.heroW >= 0.999) restU = REST + Math.round((idle - REST) / TAU) * TAU;
    const base = still ? REST : restU + (idle - restU) * st.heroW;
    spin.rotation.y = base + TAU * (st.turns + st.spin);

    // pointer tilt and highlight travel
    const k = 1 - Math.exp(-dt * 4);
    ptr.x += (ptr.tx - ptr.x) * k; ptr.y += (ptr.ty - ptr.y) * k;
    const px = still ? 0 : ptr.x, py = still ? 0 : ptr.y;
    tilt.rotation.z = -px * 0.12 * 0.6;
    tilt.rotation.x = py * 0.12 * 0.5;
    scene.environmentRotation.y = px * 0.55;

    // desktop scents: the bottle moves to the side opposite the copy
    const bx = st.x * Vw * 0.2;
    holder.position.x = bx;
    // the 틈 trails the bottle a little, so it seems to pass behind the glass as the bottle moves
    const vel = (bx - prevX) / Math.max(dt, 0.001);
    prevX = bx;
    const target = bx * 0.82 - px * 0.32 - (still ? 0 : Math.max(-1.2, Math.min(1.2, vel * 0.12)));
    glyphX += (target - glyphX) * (still ? 1 : 1 - Math.exp(-dt * 5));
    glyph.position.x = glyphX;
    const gscale = 0.82 + 0.18 * st.glyph;
    const plane = (frameInfo.inkH / inkFrac) * gscale;
    glyph.scale.set(plane, plane, 1);
    // shrink toward the horizon so the glyph keeps standing on the same line
    glyph.position.y = frameInfo.hzY + (frameInfo.centerY - frameInfo.hzY) * gscale;
    setColor(lineMat.uniforms.ink.value, st.ink);
    const hv = Math.max(0, 1 - st.pass * 1.8) * (st.horizonDraw == null ? 1 : st.horizonDraw);
    line.visible = hv > 0.01;
    line.scale.x = Vw * frameInfo.kz * 1.4 * Math.max(0.001, st.horizonDraw == null ? 1 : st.horizonDraw);
    lineMat.uniforms.amt.value = 0.42 * Math.max(0, 1 - st.pass * 1.8);

    const sig = [hv.toFixed(3), spin.rotation.y.toFixed(4), bx.toFixed(3), glyphX.toFixed(3), ptr.x.toFixed(3), ptr.y.toFixed(3), st.bg.join(), st.ink.join(), st.liquid.join(), envBlob, labelDrawn].join('|');
    if (sig === lastSig && !dirty) return;
    lastSig = sig; dirty = false;
    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      canvas.classList.add('is-ready');
      document.documentElement.classList.add('gl-ready');
    }
  }

  function start() { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible && !document.hidden) start(); else stop();
  }, { rootMargin: '80px 0px' });
  io.observe(document.getElementById('stage'));
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (visible) start(); });

  let rT;
  addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(frame, 150); });
  matchMedia('(min-width: 900px)').addEventListener('change', () => setTimeout(frame, 60));

  window.TEUM_SCENE = { kick() { dirty = true; start(); } };

  // fonts for the canvas glyph and label; draw once now, again when the real faces arrive
  const fontsP = document.fonts ? Promise.all([
    document.fonts.load('600 200px "Noto Serif KR"', '틈'),
    document.fonts.load('400 50px "Noto Serif KR"', '무화과유자이끼비'),
    document.fonts.load('300 30px "Jost"', 'TEUMNo.1234eaudeparfml')
  ]) : Promise.resolve();
  let fontsApplied = false;
  const applyFonts = () => {
    if (fontsApplied) return; fontsApplied = true;
    drawGlyph(); glyphTex.needsUpdate = true;
    labelDrawn = -1; dirty = true;
  };
  fontsP.then(applyFonts, applyFonts);

  frame();
  updateEnv(TEUM.state.liquid);
  drawLabel(TEUM.state.labelIdx);
  start();

  addEventListener('pagehide', () => {
    stop();
    [glassGeo, liquidGeo, capGeo, glyph.geometry, label.geometry, shadow.geometry, collar.geometry].forEach((g) => g.dispose());
    [glassMat, liquidMat, capMat, collarMat, glyphMat, labelMat, shadow.material].forEach((m) => m.dispose());
    [envTex, glyphTex, labelTex].forEach((t) => t.dispose());
    if (envRT) envRT.dispose();
    pmrem.dispose();
    renderer.dispose();
  });
}
