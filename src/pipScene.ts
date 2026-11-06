import { createNaturalMotion, type PipPose } from "./pipMotion";
export type { PipPose } from "./pipMotion";
const SIZE = 1254;
type Layer = { canvas: HTMLCanvasElement; x: number; y: number };

async function loadImage(url: string) {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

/** A layered, illustrated puppet: authored fur, facial expressions and local articulation. */
export async function createPipScene(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  const [rest, talking, blinking] = await Promise.all([
    loadImage("/images/pip-rest.png"),
    loadImage("/images/pip-oral.png"),
    loadImage("/images/pip-blink.png"),
  ]);
  const resources: HTMLCanvasElement[] = [];
  function surface(width: number, height: number) {
    const element = document.createElement("canvas");
    element.width = width;
    element.height = height;
    resources.push(element);
    return element;
  }
  const headPath = new Path2D(
    "M0 0H1254V605H960Q870 676 730 687L570 704Q430 690 380 640H0Z",
  );
  const tailPath = new Path2D(
    "M0 680H300C420 660 510 810 500 890C480 935 420 960 420 1060L430 1195H0Z",
  );
  const pawPath = new Path2D(
    "M805 740C875 735 910 675 940 650C1040 590 1120 675 1090 740C1050 790 995 800 975 840C930 890 880 900 820 870Z",
  );
  function layer(
    path: Path2D,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Layer {
    const element = surface(width, height);
    const ctx = element.getContext("2d")!;
    ctx.save();
    ctx.translate(-x, -y);
    ctx.clip(path);
    ctx.drawImage(rest, 0, 0, SIZE, SIZE);
    ctx.restore();
    return { canvas: element, x, y };
  }
  const head = layer(headPath, 270, 0, 735, 710);
  const earLeftPath = new Path2D(
    "M280 125H350L505 245Q480 320 410 465L335 420L280 330Z",
  );
  const earRightPath = new Path2D("M630 0H1000V365H900Q845 285 680 280Z");
  const earLeft = layer(earLeftPath, 280, 120, 260, 360);
  const earRight = layer(earRightPath, 620, 0, 400, 380);
  const headContext = head.canvas.getContext("2d")!;
  headContext.save();
  headContext.translate(-head.x, -head.y);
  headContext.globalCompositeOperation = "destination-out";
  for (const [path, x, y] of [
    [earLeftPath, 430, 400],
    [earRightPath, 820, 300],
  ] as const) {
    headContext.save();
    headContext.translate(x, y);
    headContext.scale(0.985, 0.985);
    headContext.translate(-x, -y);
    headContext.fill(path);
    headContext.restore();
  }
  headContext.restore();
  const tail = layer(tailPath, 110, 675, 415, 530);
  const paw = layer(pawPath, 795, 610, 320, 295);
  const body = surface(SIZE, SIZE);
  const bodyContext = body.getContext("2d")!;
  bodyContext.drawImage(rest, 0, 0, SIZE, SIZE);
  bodyContext.globalCompositeOperation = "destination-out";
  for (const path of [headPath, tailPath, pawPath]) bodyContext.fill(path);
  bodyContext.globalCompositeOperation = "source-over";

  function patch(
    image: HTMLImageElement,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
  ): Layer {
    const element = surface(Math.ceil(rx * 2), Math.ceil(ry * 2));
    const ctx = element.getContext("2d")!;
    ctx.translate(rx, ry);
    ctx.scale(rx, ry);
    const feather = ctx.createRadialGradient(0, 0, 0.66, 0, 0, 1);
    feather.addColorStop(0, "#fff");
    feather.addColorStop(1, "#fff0");
    ctx.fillStyle = feather;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-in";
    ctx.drawImage(image, -(cx - rx), -(cy - ry), SIZE, SIZE);
    return { canvas: element, x: cx - rx, y: cy - ry };
  }
  const eyes = [
    patch(blinking, 584, 466, 94, 78),
    patch(blinking, 811, 412, 74, 74),
  ];
  const mouth = patch(talking, 733, 566, 94, 58);
  const face = surface(
    Math.ceil(head.canvas.width * 0.65),
    Math.ceil(head.canvas.height * 0.65),
  );
  const faceContext = face.getContext("2d")!;
  const motion = createNaturalMotion();
  let width = 0,
    height = 0,
    pixelRatio = 1;
  function resize(w: number, h: number) {
    if (w === width && h === height) return;
    width = w;
    height = h;
    pixelRatio = Math.min(devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(w * pixelRatio);
    canvas.height = Math.round(h * pixelRatio);
  }
  function draw(layer: Layer) {
    context!.drawImage(layer.canvas, layer.x, layer.y);
  }
  function render(pose: PipPose) {
    const m = motion(pose);
    faceContext.setTransform(0.65, 0, 0, 0.65, 0, 0);
    faceContext.clearRect(0, 0, head.canvas.width, head.canvas.height);
    faceContext.save();
    faceContext.translate(-head.x, -head.y);
    for (const [ear, x, y, angle] of [
      [earLeft, 430, 400, m.earLeft * 0.5],
      [earRight, 820, 300, m.earRight * 0.5],
    ] as const) {
      faceContext.save();
      faceContext.translate(x, y);
      faceContext.rotate(angle);
      faceContext.translate(-x, -y);
      faceContext.drawImage(ear.canvas, ear.x, ear.y);
      faceContext.restore();
    }
    faceContext.restore();
    faceContext.drawImage(head.canvas, 0, 0);
    faceContext.globalAlpha = 1 - m.blink;
    for (const eye of eyes)
      faceContext.drawImage(eye.canvas, eye.x - head.x, eye.y - head.y);
    faceContext.globalAlpha = Math.min(1, m.open * 1.35);
    faceContext.save();
    const mouthX = mouth.x + mouth.canvas.width / 2 - head.x;
    const mouthY = mouth.y + mouth.canvas.height / 2 - head.y;
    faceContext.translate(mouthX, mouthY + m.open * 2);
    faceContext.scale(1 - m.round * 0.09, 1 + m.open * 0.06);
    faceContext.drawImage(
      mouth.canvas,
      -mouth.canvas.width / 2,
      -mouth.canvas.height / 2,
    );
    faceContext.restore();
    faceContext.globalAlpha = 1;

    context!.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context!.clearRect(0, 0, width, height);
    const scale = Math.min((width - 8) / 1050, (height - 24) / 1160);
    context!.translate(width / 2, height - 12);
    context!.scale(scale, scale);
    context!.translate(-630, -1190);
    context!.save();
    context!.translate(445, 1035);
    context!.rotate(m.tailYaw * 0.22 + m.tailRoll * 0.4);
    context!.translate(-445, -1035);
    draw(tail);
    context!.restore();
    context!.save();
    context!.translate(630, 1180);
    context!.scale(1 + m.breath * 0.2, 1 + m.breath);
    context!.translate(-630, -1180);
    // Backing at the neck/shoulder stays behind the illustrated layers during small turns.
    context!.fillStyle = "#285349";
    context!.beginPath();
    context!.ellipse(658, 700, 122, 44, 0, 0, Math.PI * 2);
    context!.fill();
    context!.fillStyle = "#c86b32";
    context!.beginPath();
    context!.ellipse(841, 808, 45, 55, -0.3, 0, Math.PI * 2);
    context!.fill();
    context!.save();
    context!.translate(833, 817);
    context!.rotate(-m.shoulder * 0.12 + m.elbow * 0.045);
    context!.translate(-833, -817);
    draw(paw);
    context!.restore();
    context!.drawImage(body, 0, 0);
    context!.save();
    context!.translate(656 + m.eyesX * 2, 678 + m.breath * 30);
    context!.rotate(-m.headTilt * 0.6 + m.headYaw * 0.13);
    context!.scale(1 - Math.abs(m.headYaw) * 0.025, 1);
    context!.translate(-656, -678);
    context!.drawImage(
      face,
      head.x,
      head.y,
      head.canvas.width,
      head.canvas.height,
    );
    context!.restore();
    context!.restore();
    return { open: m.open, blink: m.blink, waving: m.shoulder > 1 };
  }
  function dispose() {
    resources.forEach((element) => {
      element.width = element.height = 1;
    });
    for (const image of [rest, talking, blinking]) image.removeAttribute("src");
    canvas.width = canvas.height = 1;
  }
  return { resize, render, dispose };
}
