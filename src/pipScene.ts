import * as THREE from "three";

export interface PipPose {
  time: number;
  delta: number;
  open: number;
  round: number;
  listening: boolean;
  thinking: boolean;
  still: boolean;
  wave: number;
  lookX: number;
  lookY: number;
}

/** Local, articulated character. No remote model, camera, tracking or audio access. */
export function createPipScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
  camera.position.set(0, 1.9, 7.15);
  camera.lookAt(0, 1.85, 0);
  scene.add(new THREE.HemisphereLight(0xf5edff, 0x554466, 2.3));
  const light = (
    color: number,
    intensity: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const result = new THREE.DirectionalLight(color, intensity);
    result.position.set(x, y, z);
    scene.add(result);
  };
  light(0xffe7c2, 3.5, -3, 5, 5);
  light(0xbba7ff, 1.5, 4, 3, 2);
  light(0xffc984, 2, 0, 4, -3);
  const material = (color: number, roughness = 0.65) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
  const orange = material(0xe97724);
  const warm = material(0xf68a31);
  const cream = material(0xffe5b9);
  const pink = material(0xc85d68);
  const noseMaterial = material(0x352628, 0.3);
  const mouthMaterial = material(0x4e252d);
  const tongueMaterial = material(0xee8f98);
  const scarfMaterial = material(0x22584f);
  const white = material(0xfff7e9, 0.24);
  const irisMaterial = material(0x754125, 0.25);
  const pupilMaterial = material(0x21161d, 0.18);
  const glintMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const sphere = new THREE.SphereGeometry(1, 32, 24);
  const root = new THREE.Group();
  scene.add(root);
  function oval(
    parent: THREE.Object3D,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
  ) {
    const mesh = new THREE.Mesh(sphere, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    parent.add(mesh);
    return mesh;
  }
  function line(
    parent: THREE.Object3D,
    points: number[][],
    radius: number,
    mat: THREE.Material,
  ) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...(p as [number, number, number]))),
    );
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 22, radius, 8, false),
      mat,
    );
    parent.add(mesh);
    return mesh;
  }
  const body = new THREE.Group();
  body.position.y = 0.22;
  root.add(body);
  oval(body, orange, 0, 0.9, 0, 0.62, 0.83, 0.46);
  oval(body, cream, 0, 0.94, 0.39, 0.39, 0.6, 0.135);
  for (const side of [-1, 1]) {
    oval(root, orange, side * 0.35, 0.27, 0.22, 0.3, 0.22, 0.4);
    oval(root, cream, side * 0.35, 0.24, 0.5, 0.21, 0.12, 0.14);
    for (const toe of [-1, 1])
      line(
        root,
        [
          [side * 0.35 + toe * 0.065, 0.34, 0.52],
          [side * 0.35 + toe * 0.065, 0.27, 0.62],
        ],
        0.009,
        orange,
      );
  }
  const arms: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.53, 1.5, 0.04);
    oval(arm, orange, 0, -0.29, 0, 0.17, 0.38, 0.18);
    oval(arm, warm, 0, -0.59, 0.04, 0.21, 0.22, 0.2);
    oval(arm, cream, 0, -0.64, 0.17, 0.14, 0.13, 0.08);
    arm.rotation.z = side * 0.22;
    body.add(arm);
    arms.push(arm);
  }
  const tail = new THREE.Group();
  tail.position.set(0.37, 0.6, -0.25);
  root.add(tail);
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.65, -0.02, 0.03),
    new THREE.Vector3(0.93, 0.45, 0.04),
    new THREE.Vector3(0.91, 0.96, 0.06),
    new THREE.Vector3(0.67, 1.36, 0.1),
  ]);
  const rings = 42,
    sides = 18;
  const vertices: number[] = [],
    indices: number[] = [];
  const frames = tailCurve.computeFrenetFrames(rings, false);
  for (let ring = 0; ring <= rings; ring++) {
    const t = ring / rings;
    const center = tailCurve.getPointAt(t);
    const radius =
      (0.16 + 0.23 * Math.sin(t * Math.PI)) * Math.pow(1 - t, 0.3) + 0.012;
    for (let side = 0; side <= sides; side++) {
      const angle = (side / sides) * Math.PI * 2;
      const vertex = center
        .clone()
        .addScaledVector(frames.normals[ring], Math.cos(angle) * radius)
        .addScaledVector(
          frames.binormals[ring],
          Math.sin(angle) * radius * 0.82,
        );
      vertices.push(vertex.x, vertex.y, vertex.z);
    }
  }
  const tailGeometry = new THREE.BufferGeometry();
  tailGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  for (let ring = 0; ring < rings; ring++) {
    const start = indices.length;
    for (let side = 0; side < sides; side++) {
      const a = ring * (sides + 1) + side,
        b = a + sides + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
    tailGeometry.addGroup(
      start,
      indices.length - start,
      ring / rings > 0.64 ? 1 : 0,
    );
  }
  tailGeometry.setIndex(indices);
  tailGeometry.computeVertexNormals();
  tail.add(new THREE.Mesh(tailGeometry, [orange, cream]));
  const scarfRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.47, 0.115, 12, 40),
    scarfMaterial,
  );
  scarfRing.rotation.x = Math.PI / 2;
  scarfRing.position.set(0, 1.78, 0.02);
  body.add(scarfRing);
  oval(body, scarfMaterial, -0.17, 1.43, 0.5, 0.16, 0.39, 0.07).rotation.z =
    -0.24;
  oval(body, scarfMaterial, 0.1, 1.53, 0.51, 0.13, 0.25, 0.07).rotation.z =
    0.35;
  oval(body, scarfMaterial, -0.05, 1.73, 0.49, 0.18, 0.13, 0.12);
  const head = new THREE.Group();
  head.position.set(0, 2.37, 0.03);
  root.add(head);
  oval(head, warm, 0, 0, 0, 0.82, 0.73, 0.6);
  // Small cheek tufts break the silhouette without expensive hair rendering.
  for (const side of [-1, 1]) {
    oval(head, orange, side * 0.64, -0.13, 0.13, 0.25, 0.2, 0.26).rotation.z =
      side * 0.45;
    oval(head, cream, side * 0.37, -0.27, 0.4, 0.43, 0.34, 0.25).rotation.z =
      side * 0.12;
    oval(head, cream, side * 0.7, -0.21, 0.28, 0.18, 0.11, 0.15).rotation.z =
      side * -0.3;
  }
  const earShape = new THREE.Shape();
  earShape.moveTo(-0.31, -0.08);
  earShape.quadraticCurveTo(-0.39, 0.4, -0.16, 0.94);
  earShape.quadraticCurveTo(-0.1, 1.06, 0, 0.91);
  earShape.quadraticCurveTo(0.32, 0.43, 0.31, -0.08);
  earShape.quadraticCurveTo(0, -0.22, -0.31, -0.08);
  const earGeometry = new THREE.ExtrudeGeometry(earShape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.065,
    bevelThickness: 0.065,
    curveSegments: 18,
  });
  const ears: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(side * 0.51, 0.4, -0.03);
    ear.scale.set(1.08, 0.78, 1);
    ear.rotation.z = -side * 0.22;
    const outer = new THREE.Mesh(earGeometry, orange);
    ear.add(outer);
    const inner = new THREE.Mesh(earGeometry, pink);
    inner.scale.set(0.62, 0.68, 0.35);
    inner.position.set(-0.01, 0.07, 0.17);
    ear.add(inner);
    head.add(ear);
    ears.push(ear);
  }
  const eyes: { group: THREE.Group; iris: THREE.Group; closed: THREE.Mesh }[] =
    [];
  for (const side of [-1, 1]) {
    const group = new THREE.Group();
    group.position.set(side * 0.325, 0.13, 0.51);
    group.rotation.z = side * -0.045;
    oval(group, white, 0, 0, 0, 0.27, 0.32, 0.145);
    const iris = new THREE.Group();
    iris.position.set(-side * 0.018, -0.01, 0.13);
    oval(iris, irisMaterial, 0, 0, 0, 0.156, 0.205, 0.07);
    oval(iris, pupilMaterial, 0, 0, 0.052, 0.084, 0.142, 0.036);
    oval(iris, glintMaterial, -0.046, 0.076, 0.083, 0.041, 0.052, 0.012);
    oval(iris, glintMaterial, 0.046, -0.066, 0.08, 0.018, 0.022, 0.009);
    group.add(iris);
    head.add(group);
    const closed = line(
      head,
      [
        [side * 0.325 - 0.22, 0.11, 0.65],
        [side * 0.325, 0.08, 0.69],
        [side * 0.325 + 0.22, 0.12, 0.65],
      ],
      0.025,
      orange,
    );
    closed.visible = false;
    eyes.push({ group, iris, closed });
    line(
      head,
      [
        [side * 0.325 - 0.19, 0.49, 0.49],
        [side * 0.325, 0.53, 0.56],
        [side * 0.325 + 0.16, 0.48, 0.48],
      ],
      0.035,
      orange,
    );
  }
  oval(head, mouthMaterial, 0, -0.36, 0.671, 0.27, 0.025, 0.045);
  const mouth = head.children[head.children.length - 1] as THREE.Mesh;
  const tongue = oval(
    head,
    tongueMaterial,
    0,
    -0.41,
    0.705,
    0.12,
    0.027,
    0.025,
  );
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.29, 0.37);
  oval(jaw, cream, 0, -0.13, 0.24, 0.285, 0.14, 0.15);
  head.add(jaw);
  for (const side of [-1, 1])
    oval(head, cream, side * 0.16, -0.19, 0.62, 0.25, 0.18, 0.22);
  oval(head, noseMaterial, 0, -0.075, 0.817, 0.14, 0.095, 0.1);
  oval(head, glintMaterial, -0.03, -0.04, 0.907, 0.039, 0.013, 0.006);
  line(
    head,
    [
      [0, -0.13, 0.823],
      [0, -0.23, 0.827],
      [-0.08, -0.275, 0.82],
    ],
    0.013,
    mouthMaterial,
  );
  line(
    head,
    [
      [0, -0.23, 0.827],
      [0.08, -0.275, 0.82],
    ],
    0.013,
    mouthMaterial,
  );
  let mouthOpen = 0,
    mouthRound = 0;
  let lookX = 0,
    lookY = 0;
  let width = 0,
    height = 0;
  function resize(w: number, h: number) {
    if (width === w && height === h) return;
    width = w;
    height = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }
  function render(pose: PipPose) {
    const t = pose.time;
    const active = pose.still ? 0 : 1;
    const easing = 1 - Math.exp(-pose.delta * 18);
    mouthOpen = pose.still
      ? 0
      : THREE.MathUtils.lerp(mouthOpen, pose.open, easing);
    mouthRound = pose.still
      ? 0
      : THREE.MathUtils.lerp(mouthRound, pose.round, easing);
    const gazeEase = 1 - Math.exp(-pose.delta * 7);
    lookX = pose.still ? 0 : THREE.MathUtils.lerp(lookX, pose.lookX, gazeEase);
    lookY = pose.still ? 0 : THREE.MathUtils.lerp(lookY, pose.lookY, gazeEase);
    root.rotation.y = -0.11 + lookX * 0.1 * active;
    body.scale.y = 1 + Math.sin(t * 1.65) * 0.012 * active;
    head.rotation.y = (lookX * 0.23 + Math.sin(t * 0.7) * 0.025) * active;
    head.rotation.x = (lookY * 0.1 + Math.sin(t * 1.9) * 0.012) * active;
    head.rotation.z =
      (pose.listening
        ? 0.13
        : pose.thinking
          ? -0.09
          : Math.sin(t * 0.8) * 0.018) * active;
    head.position.y = 2.37 + Math.sin(t * 1.65) * 0.012 * active;
    tail.rotation.z =
      Math.sin(t * (pose.listening ? 2.4 : 1.3)) * 0.09 * active;
    tail.rotation.y = Math.sin(t * 1.1) * 0.12 * active;
    const blinkPhase = t % 4.7;
    const blink = active
      ? Math.max(0.035, 1 - Math.exp(-Math.pow((blinkPhase - 4.22) / 0.085, 2)))
      : 1;
    for (const eye of eyes) {
      eye.group.scale.y = blink;
      eye.closed.visible = blink < 0.2;
      eye.iris.position.x = lookX * 0.04 * active;
      eye.iris.position.y = (-0.01 - lookY * 0.025) * active;
    }
    ears.forEach((ear, i) => {
      const side = i === 0 ? -1 : 1;
      ear.rotation.z =
        -side * 0.22 +
        (Math.sin(t * 1.15 + i * 2) * 0.025 +
          (pose.listening ? side * 0.08 : 0)) *
          active;
    });
    arms[0].rotation.z = -0.22 + Math.sin(t * 1.65) * 0.014 * active;
    const waving = Math.max(0, 1 - Math.pow((pose.wave - 1.2) / 1.2, 8));
    arms[1].rotation.z =
      0.22 + waving * (2.05 + Math.sin(t * 13) * 0.19) * active;
    arms[1].rotation.x = -waving * 0.3 * active;
    jaw.rotation.x = mouthOpen * 0.48;
    jaw.position.y = -0.29 - mouthOpen * 0.065;
    mouth.scale.x = 0.27 * (1 - mouthRound * 0.28);
    // The mesh starts with a 0.025 y scale, so scale.y is expressed in world units.
    mouth.scale.y = 0.025 + mouthOpen * 0.15;
    mouth.position.y = -0.36 - mouthOpen * 0.03;
    tongue.position.y = -0.39 - mouthOpen * 0.09;
    tongue.visible = mouthOpen > 0.15;
    renderer.render(scene, camera);
    return { open: mouthOpen, blink, waving: arms[1].rotation.z > 1 };
  }
  function dispose() {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        (Array.isArray(object.material)
          ? object.material
          : [object.material]
        ).forEach((mat) => materials.add(mat));
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((mat) => mat.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
  }
  return { resize, render, dispose };
}
