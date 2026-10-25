// 첫 화면 배경: 마우스를 따라 물결치는 3D 상자 격자 (흑백)
// 페이지가 다 뜬 뒤에 Three.js를 불러와서 첫 화면 글자가 늦게 뜨지 않게 한다.

// 바꾸고 싶으면 여기 숫자만 고친다
const CONFIG = {
  cols: 34,            // 가로 상자 수
  rows: 24,            // 세로(안쪽) 상자 수
  spacing: 1.1,        // 상자 사이 간격
  sides: 12,           // 상자 옆면 수 (3~12, 많을수록 둥글다)
  size: 0.46,          // 상자 반지름
  height: 0.55,        // 상자 높이
  peak: 1.9,           // 가장 높이 솟는 높이
  waveRadius: 3.0,     // 마우스 주변 물결 넓이
  speed: 1,            // 물결 속도 (0.5 느리게 ~ 2 빠르게)
  boxColor: '#f1f1f1', // 평소 상자 색
  crestColor: '#9a9a9a', // 가장 높이 솟은 상자 색
  background: '#ffffff',
};

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

const holder = document.querySelector('.hero__grid');
const hero = document.querySelector('.hero');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200));
const begin = () => idle(() => import(THREE_URL).then(init).catch(() => {}));
if (holder && hero) {
  if (document.readyState === 'complete') begin();
  else window.addEventListener('load', begin, { once: true });
}

function init(THREE) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch {
    return; // WebGL이 안 되면 흰 배경 그대로
  }
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.setClearColor(CONFIG.background);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  holder.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(CONFIG.background, 16, 38);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 12, 11);
  camera.lookAt(0, 0, 0.8);

  // 조명: 위에서 부드럽게 + 비스듬한 빛으로 그림자
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe2e2e2, 2.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.9);
  sun.position.set(-7, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 18, bottom: -18, near: 1, far: 50 });
  sun.shadow.bias = -0.0004;
  sun.shadow.radius = 4;
  scene.add(sun);

  // 바닥: 그림자만 받는 투명한 면
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.ShadowMaterial({ opacity: 0.07 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // 상자: 옆면 수를 바꿀 수 있는 기둥 하나를 여러 번 그린다
  const sides = Math.max(3, Math.min(12, Math.round(CONFIG.sides)));
  const geo = new THREE.CylinderGeometry(CONFIG.size, CONFIG.size, CONFIG.height, sides, 1);
  geo.rotateY(Math.PI / sides);
  geo.translate(0, CONFIG.height / 2, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0 });
  const count = CONFIG.cols * CONFIG.rows;
  const boxes = new THREE.InstancedMesh(geo, mat, count);
  boxes.castShadow = true;
  boxes.receiveShadow = true;
  scene.add(boxes);

  const xs = new Float32Array(count), zs = new Float32Array(count);
  const ys = new Float32Array(count), vs = new Float32Array(count);
  const w = (CONFIG.cols - 1) * CONFIG.spacing, d = (CONFIG.rows - 1) * CONFIG.spacing;
  for (let r = 0, i = 0; r < CONFIG.rows; r++) {
    for (let c = 0; c < CONFIG.cols; c++, i++) {
      // 한 줄씩 반 칸 엇갈려 놓는다
      xs[i] = c * CONFIG.spacing - w / 2 + (r % 2 ? CONFIG.spacing / 2 : 0);
      zs[i] = r * CONFIG.spacing - d / 2 - 2;
    }
  }

  const base = new THREE.Color(CONFIG.boxColor), crest = new THREE.Color(CONFIG.crestColor), tmp = new THREE.Color();
  const dummy = new THREE.Object3D();
  const write = () => {
    for (let i = 0; i < count; i++) {
      dummy.position.set(xs[i], ys[i], zs[i]);
      dummy.updateMatrix();
      boxes.setMatrixAt(i, dummy.matrix);
      tmp.copy(base).lerp(crest, Math.min(1, Math.max(0, ys[i] / CONFIG.peak)));
      boxes.setColorAt(i, tmp);
    }
    boxes.instanceMatrix.needsUpdate = true;
    boxes.instanceColor.needsUpdate = true;
  };

  const resize = () => {
    const { width, height } = holder.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // 세로 화면에서는 조금 더 멀리서 본다
    camera.position.set(0, camera.aspect < 1 ? 19 : 14, camera.aspect < 1 ? 16 : 12.5);
    camera.lookAt(0, 0, 0.8);
    camera.updateProjectionMatrix();
  };
  resize();
  new ResizeObserver(() => { resize(); if (reduce) renderer.render(scene, camera); }).observe(holder);

  write();
  renderer.render(scene, camera);
  holder.classList.add('is-ready');
  if (reduce) return; // 움직임 줄이기 설정이면 멈춘 화면 한 장만

  // 마우스·손가락 위치를 바닥 위의 점으로 바꾼다
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  const toGround = (e) => {
    const rect = holder.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(ground, hit) ? hit : null;
  };

  const pointer = { x: 0, z: 0, on: false, lastX: 0, lastZ: 0, lastSpawn: 0, lastMove: -1e9 };
  const ripples = [];
  const spawn = (x, z, amp) => { ripples.push({ x, z, t: 0, amp }); if (ripples.length > 10) ripples.shift(); };

  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const p = toGround(e);
    if (!p) return;
    pointer.x = p.x; pointer.z = p.z; pointer.on = true; pointer.lastMove = performance.now();
    const moved = Math.hypot(p.x - pointer.lastX, p.z - pointer.lastZ);
    if (moved > 1.6 && performance.now() - pointer.lastSpawn > 110) {
      spawn(p.x, p.z, Math.min(1, moved / 4));
      pointer.lastX = p.x; pointer.lastZ = p.z; pointer.lastSpawn = performance.now();
    }
  });
  hero.addEventListener('pointerleave', () => { pointer.on = false; });
  hero.addEventListener('pointerdown', (e) => {
    const p = toGround(e);
    if (p) spawn(p.x, p.z, 1);
  });

  // 화면에 보일 때만 그린다
  let visible = true, raf = 0;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) loop(); }, { threshold: 0 }).observe(hero);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });

  let hover = 0, last = performance.now(), time = 0, nextAuto = 1.2;
  const r2 = CONFIG.waveRadius * CONFIG.waveRadius;
  const k = 0.11 * CONFIG.speed, damp = 0.84;

  function loop() {
    cancelAnimationFrame(raf);
    if (!visible || document.hidden) return;
    raf = requestAnimationFrame(frame);
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt * CONFIG.speed;

    // 마우스가 없을 때(폰 포함)는 가끔 저절로 물결이 인다
    if (!pointer.on || now - pointer.lastMove > 3000) {
      nextAuto -= dt;
      if (nextAuto <= 0) {
        spawn((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 6 - 1, 0.85);
        nextAuto = 2.4 + Math.random() * 1.6;
      }
    }
    hover += ((pointer.on ? 1 : 0) - hover) * 0.06;

    for (let n = ripples.length - 1; n >= 0; n--) {
      ripples[n].t += dt * CONFIG.speed;
      if (ripples[n].t > 3.2) ripples.splice(n, 1);
    }

    for (let i = 0; i < count; i++) {
      const x = xs[i], z = zs[i];
      let target = 0.05 * Math.sin(x * 0.42 + time * 0.7) * Math.cos(z * 0.38 + time * 0.55);
      if (hover > 0.001) {
        const dx = x - pointer.x, dz = z - pointer.z;
        target += hover * CONFIG.peak * Math.exp(-(dx * dx + dz * dz) / r2);
      }
      for (let n = 0; n < ripples.length; n++) {
        const rp = ripples[n];
        const dx = x - rp.x, dz = z - rp.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const front = rp.t * 5.2;
        const band = Math.exp(-((dist - front) * (dist - front)) / 2.2);
        target += rp.amp * CONFIG.peak * 0.55 * band * Math.cos((dist - front) * 1.4) * Math.exp(-rp.t * 1.1);
      }
      vs[i] += (target - ys[i]) * k;
      vs[i] *= damp;
      ys[i] = Math.max(-0.25, ys[i] + vs[i]);
    }

    write();
    renderer.render(scene, camera);
    loop();
  }

  loop();
}
