import * as THREE from "three";
import { BOOKS, MOON_PHASES } from "@/lib/escape-room/puzzle";

// 외부 이미지 없이 캔버스로 그리는 절차적 텍스처. 한 번 만들어 여러 재질이 공유합니다.

const SERIF = '"Noto Serif KR", "Nanum Myeongjo", AppleMyungjo, Batang, "Times New Roman", serif';
const SANS = 'Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif';

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise(seed: number) {
  const random = rng(seed);
  const size = 256;
  const perm = new Uint8Array(size * 2);
  const values = new Float32Array(size);
  for (let i = 0; i < size; i += 1) {
    perm[i] = i;
    values[i] = random();
  }
  for (let i = size - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < size; i += 1) perm[i + size] = perm[i];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const lattice = (x: number, y: number) => values[perm[(perm[x & 255] + y) & 511]];
  const noise = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = smooth(x - xi);
    const yf = smooth(y - yi);
    const a = lattice(xi, yi);
    const b = lattice(xi + 1, yi);
    const c = lattice(xi, yi + 1);
    const d = lattice(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
  return (x: number, y: number, octaves = 4) => {
    let sum = 0;
    let amp = 0.5;
    let freq = 1;
    for (let i = 0; i < octaves; i += 1) {
      sum += noise(x * freq, y * freq) * amp;
      freq *= 2;
      amp *= 0.5;
    }
    return sum;
  };
}

function canvas(width: number, height: number) {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  const context = element.getContext("2d");
  if (!context) throw new Error("2D canvas unavailable");
  return { element, ctx: context };
}

function toTexture(element: HTMLCanvasElement, options: { repeat?: [number, number]; color?: boolean } = {}) {
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = options.color === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  if (options.repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(options.repeat[0], options.repeat[1]);
  }
  texture.needsUpdate = true;
  return texture;
}

function woodPixels(width: number, height: number, seed: number, scale = 1) {
  const fbm = makeNoise(seed);
  const data = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const nx = x / width;
      const ny = y / height;
      const warp = fbm(nx * 3 * scale, ny * 0.6 * scale, 4) * 6;
      const rings = Math.sin((nx * 26 * scale + warp) * Math.PI);
      const fibers = fbm(nx * 120 * scale, ny * 6 * scale, 2);
      const value = 0.62 + rings * 0.12 + (fibers - 0.5) * 0.35;
      data[y * width + x] = Math.min(1, Math.max(0, value));
    }
  }
  return data;
}

function drawMoon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, phase: number, lit: string, dark: string) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = dark;
  ctx.fill();
  ctx.clip();
  if (phase === 4) {
    ctx.fillStyle = lit;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  } else if (phase !== 0) {
    const waxing = phase < 4;
    const k = Math.cos((phase / 8) * Math.PI * 2);
    ctx.fillStyle = lit;
    ctx.beginPath();
    if (waxing) ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2);
    else ctx.arc(x, y, r, Math.PI / 2, (Math.PI * 3) / 2);
    ctx.closePath();
    ctx.fill();
    const rx = Math.abs(k) * r;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.01, rx), r, 0, 0, Math.PI * 2);
    ctx.fillStyle = k > 0 ? dark : lit;
    ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(60,45,25,0.7)";
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.stroke();
}

export type TextureSet = ReturnType<typeof createTextures>;

export function createTextures() {
  const disposables: THREE.Texture[] = [];
  const keep = <T extends THREE.Texture>(texture: T) => {
    disposables.push(texture);
    return texture;
  };

  // 나뭇결 (밝은 톤으로 만들고 재질 색으로 물들임)
  const woodSize = 256;
  const wood = woodPixels(woodSize, woodSize, 11);
  const woodCanvas = canvas(woodSize, woodSize);
  const woodBump = canvas(woodSize, woodSize);
  {
    const image = woodCanvas.ctx.createImageData(woodSize, woodSize);
    const bump = woodBump.ctx.createImageData(woodSize, woodSize);
    for (let i = 0; i < wood.length; i += 1) {
      const v = wood[i];
      image.data[i * 4] = 150 + v * 105;
      image.data[i * 4 + 1] = 118 + v * 92;
      image.data[i * 4 + 2] = 88 + v * 70;
      image.data[i * 4 + 3] = 255;
      const b = v * 255;
      bump.data[i * 4] = b;
      bump.data[i * 4 + 1] = b;
      bump.data[i * 4 + 2] = b;
      bump.data[i * 4 + 3] = 255;
    }
    woodCanvas.ctx.putImageData(image, 0, 0);
    woodBump.ctx.putImageData(bump, 0, 0);
  }
  const woodMap = keep(toTexture(woodCanvas.element, { repeat: [1, 1] }));
  const woodBumpMap = keep(toTexture(woodBump.element, { repeat: [1, 1], color: false }));

  // 헤링본 대신 긴 마루판
  const floor = canvas(1024, 1024);
  const floorBump = canvas(1024, 1024);
  {
    const random = rng(7);
    const planks = 8;
    const plankH = 1024 / planks;
    const grain = woodPixels(512, 64, 23, 0.6);
    const grainCanvas = canvas(512, 64);
    const grainImage = grainCanvas.ctx.createImageData(512, 64);
    for (let i = 0; i < grain.length; i += 1) {
      const v = grain[i];
      grainImage.data[i * 4] = 110 + v * 90;
      grainImage.data[i * 4 + 1] = 70 + v * 62;
      grainImage.data[i * 4 + 2] = 42 + v * 40;
      grainImage.data[i * 4 + 3] = 255;
    }
    grainCanvas.ctx.putImageData(grainImage, 0, 0);
    floorBump.ctx.fillStyle = "#7a7a7a";
    floorBump.ctx.fillRect(0, 0, 1024, 1024);
    for (let row = 0; row < planks; row += 1) {
      let x = -random() * 400;
      while (x < 1024) {
        const length = 380 + random() * 320;
        const tone = 0.78 + random() * 0.35;
        floor.ctx.save();
        floor.ctx.filter = `brightness(${tone}) saturate(${0.85 + random() * 0.3})`;
        floor.ctx.drawImage(grainCanvas.element, random() * 200, 0, 300, 64, x, row * plankH, length, plankH);
        floor.ctx.restore();
        floor.ctx.fillStyle = "rgba(20,10,5,0.85)";
        floor.ctx.fillRect(x, row * plankH, 3, plankH);
        floorBump.ctx.fillStyle = "#101010";
        floorBump.ctx.fillRect(x, row * plankH, 3, plankH);
        x += length;
      }
      floor.ctx.fillStyle = "rgba(15,8,4,0.9)";
      floor.ctx.fillRect(0, row * plankH, 1024, 3);
      floorBump.ctx.fillStyle = "#0a0a0a";
      floorBump.ctx.fillRect(0, row * plankH, 1024, 3);
    }
    // 오래 밟힌 흔적
    const fbm = makeNoise(99);
    const image = floor.ctx.getImageData(0, 0, 1024, 1024);
    for (let y = 0; y < 1024; y += 2) {
      for (let x = 0; x < 1024; x += 2) {
        const n = fbm(x / 180, y / 180, 3);
        const k = 0.82 + n * 0.3;
        for (let dy = 0; dy < 2; dy += 1) {
          for (let dx = 0; dx < 2; dx += 1) {
            const i = ((y + dy) * 1024 + x + dx) * 4;
            image.data[i] *= k;
            image.data[i + 1] *= k;
            image.data[i + 2] *= k;
          }
        }
      }
    }
    floor.ctx.putImageData(image, 0, 0);
  }
  const floorMap = keep(toTexture(floor.element, { repeat: [2.2, 2.2] }));
  const floorBumpMap = keep(toTexture(floorBump.element, { repeat: [2.2, 2.2], color: false }));

  // 짙은 청록 다마스크 벽지 + 금빛 작은 별
  const wall = canvas(512, 512);
  {
    const { ctx } = wall;
    ctx.fillStyle = "#1c2c38";
    ctx.fillRect(0, 0, 512, 512);
    const fbm = makeNoise(5);
    const image = ctx.getImageData(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 1) {
      for (let x = 0; x < 512; x += 1) {
        const i = (y * 512 + x) * 4;
        const n = fbm(x / 60, y / 60, 4) - 0.5;
        image.data[i] += n * 18;
        image.data[i + 1] += n * 20;
        image.data[i + 2] += n * 22;
      }
    }
    ctx.putImageData(image, 0, 0);
    const motif = (cx: number, cy: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = "rgba(120,170,175,0.16)";
      ctx.fillStyle = "rgba(110,160,165,0.1)";
      ctx.lineWidth = 3;
      for (let side = -1; side <= 1; side += 2) {
        ctx.beginPath();
        ctx.moveTo(0, -110);
        ctx.bezierCurveTo(side * 70, -80, side * 90, -10, side * 30, 30);
        ctx.bezierCurveTo(side * 80, 60, side * 60, 110, 0, 120);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(side * 38, -30, 14, 30, side * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 44, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    motif(128, 128);
    motif(384, 384);
    motif(384, -128);
    motif(128, 640);
    motif(-128, 384);
    motif(640, 128);
    const star = (x: number, y: number, r: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = "rgba(214,176,98,0.55)";
      ctx.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const radius = i % 2 === 0 ? r : r * 0.35;
        const angle = (i / 8) * Math.PI * 2;
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    star(384, 128, 9);
    star(128, 384, 9);
    star(0, 0, 9);
    star(512, 0, 9);
    star(0, 512, 9);
    star(512, 512, 9);
    star(256, 256, 5);
  }
  const wallMap = keep(toTexture(wall.element, { repeat: [3, 1.6] }));

  // 페르시안 러그
  const rug = canvas(1024, 720);
  {
    const { ctx } = rug;
    const w = 1024;
    const h = 720;
    ctx.fillStyle = "#6e1b1f";
    ctx.fillRect(0, 0, w, h);
    const bands = [
      { inset: 0, color: "#1c2540" },
      { inset: 34, color: "#c39a52" },
      { inset: 42, color: "#1c2540" },
      { inset: 96, color: "#c39a52" },
      { inset: 104, color: "#6e1b1f" },
    ];
    bands.forEach(({ inset, color }) => {
      ctx.fillStyle = color;
      ctx.fillRect(inset, inset, w - inset * 2, h - inset * 2);
    });
    ctx.strokeStyle = "#d8b56b";
    ctx.lineWidth = 3;
    for (let x = 60; x < w - 40; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, 58);
      ctx.lineTo(x + 18, 70);
      ctx.lineTo(x, 82);
      ctx.lineTo(x - 18, 70);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, h - 58);
      ctx.lineTo(x + 18, h - 70);
      ctx.lineTo(x, h - 82);
      ctx.lineTo(x - 18, h - 70);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(w / 2, h / 2);
    const layers = [
      { rx: 250, ry: 190, color: "#1c2540" },
      { rx: 220, ry: 164, color: "#c39a52" },
      { rx: 206, ry: 152, color: "#2a3a5f" },
      { rx: 150, ry: 110, color: "#8c2a2c" },
      { rx: 96, ry: 70, color: "#d8b56b" },
      { rx: 70, ry: 50, color: "#1c2540" },
      { rx: 28, ry: 20, color: "#e9d6a6" },
    ];
    layers.forEach(({ rx, ry, color }) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i <= 16; i += 1) {
        const angle = (i / 16) * Math.PI * 2;
        const wobble = i % 2 === 0 ? 1 : 0.84;
        ctx.lineTo(Math.cos(angle) * rx * wobble, Math.sin(angle) * ry * wobble);
      }
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
    ctx.fillStyle = "rgba(216,181,107,0.8)";
    for (const [cx, cy] of [
      [190, 190],
      [w - 190, 190],
      [190, h - 190],
      [w - 190, h - 190],
    ]) {
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1c2540";
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(216,181,107,0.8)";
    }
    const fbm = makeNoise(31);
    const image = ctx.getImageData(0, 0, w, h);
    const random = rng(3);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4;
        const wear = 0.78 + fbm(x / 140, y / 140, 3) * 0.35;
        const fiber = 0.92 + random() * 0.16;
        image.data[i] *= wear * fiber;
        image.data[i + 1] *= wear * fiber;
        image.data[i + 2] *= wear * fiber;
      }
    }
    ctx.putImageData(image, 0, 0);
  }
  const rugMap = keep(toTexture(rug.element));

  // 양피지 공통 배경
  const parchment = (ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) => {
    ctx.fillStyle = "#e3d2ac";
    ctx.fillRect(0, 0, w, h);
    const fbm = makeNoise(seed);
    const image = ctx.getImageData(0, 0, w, h);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4;
        const n = fbm(x / 90, y / 90, 4);
        const edge = Math.min(x, y, w - x, h - y) / 60;
        const burn = Math.min(1, edge) * 0.25 + 0.75;
        const k = (0.78 + n * 0.36) * burn;
        image.data[i] *= k;
        image.data[i + 1] *= k * 0.97;
        image.data[i + 2] *= k * 0.9;
      }
    }
    ctx.putImageData(image, 0, 0);
  };

  // 달의 위상 포스터
  const poster = canvas(1024, 480);
  const posterSlots = MOON_PHASES.map((_, index) => 76 + index * 124.5);
  {
    const { ctx } = poster;
    parchment(ctx, 1024, 480, 41);
    ctx.strokeStyle = "rgba(90,60,30,0.7)";
    ctx.lineWidth = 3;
    ctx.strokeRect(22, 22, 980, 436);
    ctx.lineWidth = 1;
    ctx.strokeRect(32, 32, 960, 416);
    ctx.fillStyle = "#3a2716";
    ctx.textAlign = "center";
    ctx.font = `700 46px ${SERIF}`;
    ctx.fillText("달의 위상", 512, 100);
    ctx.font = `italic 22px ${SERIF}`;
    ctx.fillStyle = "#5b4128";
    ctx.fillText("PHASES OF THE MOON · 한별 천문대", 512, 136);
    MOON_PHASES.forEach((phase, index) => {
      drawMoon(ctx, posterSlots[index], 250, 46, index, "#f3e6bf", "#2b2a36");
      ctx.fillStyle = "#3a2716";
      ctx.font = `600 22px ${SANS}`;
      ctx.fillText(phase.name, posterSlots[index], 336);
      ctx.font = `16px ${SERIF}`;
      ctx.fillStyle = "#6b5236";
      ctx.fillText(`${index + 1} / 8`, posterSlots[index], 364);
    });
    ctx.strokeStyle = "rgba(90,60,30,0.45)";
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(60, 410);
    ctx.lineTo(964, 410);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `italic 18px ${SERIF}`;
    ctx.fillStyle = "#6b5236";
    ctx.fillText("차오르고, 가득 차고, 기울어 사라진다", 512, 440);
  }
  const posterMap = keep(toTexture(poster.element));

  // 포스터의 형광(UV) 층
  const posterUV = canvas(1024, 480);
  {
    const { ctx } = posterUV;
    ctx.clearRect(0, 0, 1024, 480);
    const marks: Array<[number, string]> = [
      [1, "①"],
      [4, "②"],
      [6, "③"],
    ];
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    marks.forEach(([index, label]) => {
      const x = posterSlots[index];
      ctx.shadowColor = "#7af3ff";
      ctx.shadowBlur = 18;
      ctx.strokeStyle = "#b6fbff";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x, 250, 60, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#d9fdff";
      ctx.font = `800 56px ${SANS}`;
      ctx.fillText(label, x, 172);
    });
    ctx.shadowBlur = 12;
    ctx.font = `700 26px ${SANS}`;
    ctx.fillStyle = "#c9fbff";
    ctx.fillText("달이 세 번 모습을 바꾸면", 512, 400);
  }
  const posterUVMap = keep(toTexture(posterUV.element));

  // 벽시계 문자판
  const clock = canvas(512, 512);
  {
    const { ctx } = clock;
    const gradient = ctx.createRadialGradient(256, 256, 40, 256, 256, 256);
    gradient.addColorStop(0, "#f4ead2");
    gradient.addColorStop(0.8, "#e2d2ad");
    gradient.addColorStop(1, "#b89b68");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    ctx.translate(256, 256);
    for (let i = 0; i < 60; i += 1) {
      const angle = (i / 60) * Math.PI * 2;
      const long = i % 5 === 0;
      ctx.strokeStyle = "#2c2118";
      ctx.lineWidth = long ? 7 : 2.5;
      ctx.beginPath();
      ctx.moveTo(Math.sin(angle) * (long ? 196 : 206), -Math.cos(angle) * (long ? 196 : 206));
      ctx.lineTo(Math.sin(angle) * 222, -Math.cos(angle) * 222);
      ctx.stroke();
    }
    ctx.fillStyle = "#231a13";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 50px ${SERIF}`;
    for (let i = 1; i <= 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      ctx.fillText(String(i), Math.sin(angle) * 158, -Math.cos(angle) * 158 + 3);
    }
    ctx.font = `600 17px ${SERIF}`;
    ctx.fillStyle = "#5a4630";
    ctx.fillText("HANBYEOL", 0, -72);
    ctx.font = `italic 14px ${SERIF}`;
    ctx.fillText("observatory · 1924", 0, -50);
    // 문자판 안쪽 작은 달 창
    ctx.fillStyle = "#1d2640";
    ctx.beginPath();
    ctx.arc(0, 78, 34, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#f1e3b5";
    ctx.beginPath();
    ctx.arc(0, 66, 14, 0, Math.PI * 2);
    ctx.fill();
  }
  const clockMap = keep(toTexture(clock.element));

  // 시계 아래 숨은 형광 글씨
  const clockUV = canvas(512, 160);
  {
    const { ctx } = clockUV;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#7af3ff";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#d9fdff";
    ctx.font = `700 40px ${SANS}`;
    ctx.fillText("달이 뜬 뒤, 시간이 멈췄다", 256, 62);
    ctx.font = `600 26px ${SANS}`;
    ctx.fillText("☾  24h", 256, 118);
  }
  const clockUVMap = keep(toTexture(clockUV.element));

  // 성도 액자
  const chart = canvas(1024, 760);
  {
    const { ctx } = chart;
    const gradient = ctx.createRadialGradient(512, 360, 40, 512, 380, 620);
    gradient.addColorStop(0, "#1f3057");
    gradient.addColorStop(1, "#0b1226");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 760);
    ctx.strokeStyle = "rgba(210,180,110,0.28)";
    ctx.lineWidth = 1.5;
    for (let r = 80; r < 520; r += 80) {
      ctx.beginPath();
      ctx.arc(512, 360, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(512, 360);
      ctx.lineTo(512 + Math.cos(angle) * 520, 360 + Math.sin(angle) * 520);
      ctx.stroke();
    }
    const random = rng(77);
    for (let i = 0; i < 420; i += 1) {
      const size = random() ** 3 * 2.6 + 0.4;
      ctx.fillStyle = `rgba(240,232,210,${0.35 + random() * 0.6})`;
      ctx.beginPath();
      ctx.arc(random() * 1024, random() * 680, size, 0, Math.PI * 2);
      ctx.fill();
    }
    const constellations = [
      [
        [180, 190],
        [240, 150],
        [300, 175],
        [350, 140],
        [420, 170],
      ],
      [
        [640, 150],
        [700, 210],
        [770, 190],
        [820, 250],
        [760, 300],
        [700, 280],
      ],
      [
        [300, 420],
        [360, 470],
        [440, 450],
        [470, 520],
      ],
      [
        [640, 430],
        [700, 470],
        [690, 540],
        [780, 520],
      ],
    ];
    constellations.forEach((points) => {
      ctx.strokeStyle = "rgba(226,190,112,0.85)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      points.forEach(([x, y], i) => {
        ctx.fillStyle = "#fff6d8";
        ctx.shadowColor = "#fff2c0";
        ctx.shadowBlur = i === 0 ? 16 : 6;
        ctx.beginPath();
        ctx.arc(x, y, i === 0 ? 8 : 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    });
    ctx.fillStyle = "rgba(10,14,28,0.72)";
    ctx.fillRect(0, 640, 1024, 120);
    ctx.textAlign = "center";
    ctx.fillStyle = "#e7c47e";
    ctx.font = `700 34px ${SERIF}`;
    ctx.fillText("星圖 · 별지기의 하늘", 512, 685);
    ctx.font = `italic 24px ${SERIF}`;
    ctx.fillStyle = "#d8c49a";
    ctx.fillText("가장 밝은 별에서 시작해, 선을 따라 이야기를 읽어라", 512, 728);
  }
  const chartMap = keep(toTexture(chart.element));

  // 밤하늘 (창밖)
  const sky = canvas(1024, 1024);
  {
    const { ctx } = sky;
    const gradient = ctx.createLinearGradient(0, 0, 0, 1024);
    gradient.addColorStop(0, "#050a1c");
    gradient.addColorStop(0.55, "#0e1c3e");
    gradient.addColorStop(0.85, "#23355e");
    gradient.addColorStop(1, "#3b4a6e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1024);
    const random = rng(2024);
    for (let i = 0; i < 900; i += 1) {
      const y = random() * 820;
      const size = random() ** 4 * 2.6 + 0.35;
      ctx.fillStyle = `rgba(230,236,255,${0.3 + random() * 0.7})`;
      ctx.beginPath();
      ctx.arc(random() * 1024, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    // 먼 산 능선
    ctx.fillStyle = "#070b16";
    ctx.beginPath();
    ctx.moveTo(0, 1024);
    const fbm = makeNoise(8);
    for (let x = 0; x <= 1024; x += 8) {
      ctx.lineTo(x, 900 - fbm(x / 220, 0.5, 4) * 160);
    }
    ctx.lineTo(1024, 1024);
    ctx.closePath();
    ctx.fill();
  }
  const skyMap = keep(toTexture(sky.element));

  // 달 표면
  const moon = canvas(256, 256);
  {
    const { ctx } = moon;
    const fbm = makeNoise(13);
    const image = ctx.createImageData(256, 256);
    for (let y = 0; y < 256; y += 1) {
      for (let x = 0; x < 256; x += 1) {
        const i = (y * 256 + x) * 4;
        const n = fbm(x / 40, y / 40, 5);
        const v = 180 + n * 90;
        image.data[i] = v;
        image.data[i + 1] = v * 0.98;
        image.data[i + 2] = v * 0.9;
        image.data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }
  const moonMap = keep(toTexture(moon.element));

  // 지구본
  const globe = canvas(1024, 512);
  {
    const { ctx } = globe;
    const fbm = makeNoise(61);
    const image = ctx.createImageData(1024, 512);
    for (let y = 0; y < 512; y += 1) {
      for (let x = 0; x < 1024; x += 1) {
        const i = (y * 1024 + x) * 4;
        const lat = Math.abs(y / 512 - 0.5) * 2;
        const n = fbm(x / 150, y / 150, 5) + (lat > 0.85 ? 0.25 : 0);
        const land = n > 0.55;
        if (land) {
          image.data[i] = 196 - n * 60;
          image.data[i + 1] = 168 - n * 50;
          image.data[i + 2] = 110 - n * 40;
        } else {
          image.data[i] = 58 + n * 30;
          image.data[i + 1] = 96 + n * 40;
          image.data[i + 2] = 104 + n * 40;
        }
        image.data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    ctx.strokeStyle = "rgba(60,40,20,0.35)";
    ctx.lineWidth = 1;
    for (let x = 0; x < 1024; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y < 512; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }
    const kx = ((127 + 180) / 360) * 1024;
    const ky = ((90 - 37) / 180) * 512;
    ctx.fillStyle = "#e0b04a";
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const r = i % 2 === 0 ? 12 : 5;
      const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(kx + Math.cos(angle) * r, ky + Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
  }
  const globeMap = keep(toTexture(globe.element));

  // 책등: 퍼즐 책 5권 + 일반 책 공용
  const spineFor = (hex: string, symbol: string, title: string, seed: number) => {
    const spine = canvas(128, 512);
    const { ctx } = spine;
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, 128, 512);
    const fbm = makeNoise(seed);
    const image = ctx.getImageData(0, 0, 128, 512);
    for (let y = 0; y < 512; y += 1) {
      for (let x = 0; x < 128; x += 1) {
        const i = (y * 128 + x) * 4;
        const edge = 1 - Math.pow(Math.abs(x / 128 - 0.5) * 2, 3) * 0.45;
        const k = (0.78 + fbm(x / 20, y / 20, 3) * 0.35) * edge;
        image.data[i] *= k;
        image.data[i + 1] *= k;
        image.data[i + 2] *= k;
      }
    }
    ctx.putImageData(image, 0, 0);
    ctx.fillStyle = "#d9b25e";
    [34, 46, 466, 478].forEach((y) => ctx.fillRect(0, y, 128, 5));
    if (symbol) {
      ctx.beginPath();
      ctx.arc(64, 130, 38, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(20,12,6,0.4)";
      ctx.fill();
      ctx.strokeStyle = "#e6c16c";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = "#f2d487";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `700 46px ${SANS}`;
      ctx.fillText(symbol, 64, 132);
    }
    if (title) {
      ctx.save();
      ctx.translate(64, 320);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = "#f0d18a";
      ctx.font = `700 30px ${SERIF}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(title, 0, 0);
      ctx.restore();
    }
    return keep(toTexture(spine.element));
  };
  const bookTitles = ["항성의 기록", "행성 운행론", "혜성 목록", "별자리 사전", "성운 관측기"];
  const bookSpines = BOOKS.map((book, index) => spineFor(book.hex, book.symbol, bookTitles[index], 300 + index));
  const plainSpine = spineFor("#e8e2d6", "", "", 400);

  // 궤짝 다이얼 띠 (원통 둘레를 따라 달 모양 8칸)
  const dial = canvas(1024, 128);
  {
    const { ctx } = dial;
    ctx.fillStyle = "#2a2118";
    ctx.fillRect(0, 0, 1024, 128);
    const cell = 1024 / MOON_PHASES.length;
    MOON_PHASES.forEach((_, index) => {
      const cx = cell * index + cell / 2;
      ctx.fillStyle = "#3a2d1f";
      ctx.fillRect(cell * index + 4, 6, cell - 8, 116);
      ctx.save();
      ctx.translate(cx, 64);
      // 원통 앞면에서 글자가 똑바로 보이도록 -90° 회전해서 그림
      ctx.transform(0, -1, 1, 0, 0, 0);
      drawMoon(ctx, 0, 0, 38, index, "#f3e2b0", "#161522");
      ctx.restore();
    });
  }
  const dialMap = keep(toTexture(dial.element));

  // 부드러운 원형 입자
  const dot = canvas(64, 64);
  {
    const gradient = dot.ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.35, "rgba(255,255,255,0.45)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    dot.ctx.fillStyle = gradient;
    dot.ctx.fillRect(0, 0, 64, 64);
  }
  const dotMap = keep(toTexture(dot.element));

  return {
    woodMap,
    woodBumpMap,
    floorMap,
    floorBumpMap,
    wallMap,
    rugMap,
    posterMap,
    posterUVMap,
    clockMap,
    clockUVMap,
    chartMap,
    skyMap,
    moonMap,
    globeMap,
    bookSpines,
    plainSpine,
    dialMap,
    dotMap,
    dispose() {
      disposables.forEach((texture) => texture.dispose());
    },
  };
}

// 도어락 LCD — 상태가 바뀔 때마다 다시 그립니다.
export function createLcd() {
  const { element, ctx } = canvas(256, 96);
  const texture = toTexture(element);
  const draw = (powered: boolean, entry: string, flash: "wrong" | "near" | "ok" | null) => {
    ctx.clearRect(0, 0, 256, 96);
    if (!powered) {
      ctx.fillStyle = "#0b0f0c";
      ctx.fillRect(0, 0, 256, 96);
    } else {
      const background = flash === "wrong" ? "#3a0c0c" : flash === "near" ? "#3a320c" : flash === "ok" ? "#0c3a1a" : "#0f2a1c";
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, 256, 96);
      ctx.fillStyle = flash === "wrong" ? "#ff8a80" : flash === "near" ? "#ffe082" : "#a8ffcb";
      ctx.font = `700 54px ui-monospace, "SFMono-Regular", Menlo, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const text = flash === "ok" ? "OPEN" : flash === "wrong" ? "ERROR" : flash === "near" ? "ERROR" : entry.padEnd(4, "_").split("").join(" ");
      ctx.fillText(text, 128, 52);
    }
    texture.needsUpdate = true;
  };
  draw(false, "", null);
  return { texture, draw };
}

// 궤짝 다이얼 아래 읽기 창 — 현재 선택된 달 모양을 크게 보여 줍니다.
export function createDialWindow() {
  const { element, ctx } = canvas(128, 128);
  const texture = toTexture(element);
  const draw = (phase: number, solved: boolean) => {
    ctx.clearRect(0, 0, 128, 128);
    const gradient = ctx.createRadialGradient(64, 60, 10, 64, 64, 70);
    gradient.addColorStop(0, solved ? "#1d3a24" : "#1e2236");
    gradient.addColorStop(1, "#0b0c14");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    drawMoon(ctx, 64, 64, 42, phase, "#f6e7b8", "#23222f");
    ctx.strokeStyle = solved ? "#8ee6a8" : "rgba(231,196,126,0.9)";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 122, 122);
    texture.needsUpdate = true;
  };
  draw(0, false);
  return { texture, draw };
}
