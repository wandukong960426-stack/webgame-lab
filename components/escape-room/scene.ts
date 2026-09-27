import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  BOOKS,
  HOTSPOT_BY_ID,
  hotspotLabel,
  isHotspotAvailable,
  type EscapeState,
  type HotspotId,
  type ViewId,
} from "@/lib/escape-room/puzzle";
import { createDialWindow, createLcd, createTextures } from "@/components/escape-room/textures";

export type Quality = "high" | "low";

export type SceneCallbacks = {
  onHotspot: (id: HotspotId) => void;
  onUVReveal: () => void;
  onBack: () => void;
  onQuality: (quality: Quality) => void;
  onContextLost: () => void;
};

export type EscapeSceneHandle = {
  sync: (state: EscapeState, view: ViewId, snap?: boolean) => void;
  setPaused: (paused: boolean) => void;
  setQuality: (quality: Quality) => void;
  setReducedMotion: (reduced: boolean) => void;
  look: (deltaYaw: number, deltaPitch?: number) => void;
  dispose: () => void;
};

type ViewDef = { target: [number, number, number]; dir: [number, number, number]; w: number; h: number };

const VIEWS: Record<Exclude<ViewId, "overview">, ViewDef> = {
  door: { target: [0.95, 1.28, -2.5], dir: [0, 0.06, 1], w: 2.45, h: 1.75 },
  wall: { target: [-1.55, 1.55, -2.5], dir: [0.12, -0.02, 1], w: 1.35, h: 1.7 },
  desk: { target: [-2.6, 0.98, 0.15], dir: [1, 0.12, 0], w: 1.9, h: 2.05 },
  shelf: { target: [-1.0, 1.2, 2.5], dir: [0, 0.08, -1], w: 2.15, h: 2.45 },
  chest: { target: [1.35, 0.3, 2.0], dir: [0, 0.8, -1], w: 1.0, h: 0.72 },
  painting: { target: [1.35, 1.72, 2.5], dir: [0, -0.05, -1], w: 1.35, h: 1.0 },
  telescope: { target: [2.6, 1.35, -0.3], dir: [-1, 0.12, 0.3], w: 2.05, h: 2.15 },
};

const OVERVIEW_POS = new THREE.Vector3(0, 1.6, 0.25);
const ROOM = { minX: -3, maxX: 3, minZ: -2.5, maxZ: 2.5, height: 3.2 };

class Damped {
  value: number;
  target: number;
  constructor(value = 0) {
    this.value = value;
    this.target = value;
  }
  step(dt: number, speed: number) {
    this.value += (this.target - this.value) * (1 - Math.exp(-speed * dt));
    return this.value;
  }
  snap() {
    this.value = this.target;
  }
}

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    time: { value: 0 },
    strength: { value: 0.55 },
    grain: { value: 0.018 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float strength;
    uniform float grain;
    varying vec2 vUv;
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      float v = smoothstep(0.95, 0.25, length(d * vec2(1.1, 1.25)));
      color.rgb *= mix(1.0 - strength, 1.0, v);
      float n = hash(vUv * 1024.0 + fract(time) * 97.0) - 0.5;
      color.rgb += n * grain * (0.35 + color.rgb);
      gl_FragColor = color;
    }
  `,
};

const ShaftShader = {
  uniforms: { color: { value: new THREE.Color(0.55, 0.68, 1.0) }, intensity: { value: 0.16 }, time: { value: 0 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
      vUv = uv;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vView = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    uniform float intensity;
    uniform float time;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
      float edge = pow(abs(dot(normalize(vNormal), normalize(vView))), 1.6);
      float along = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
      float flicker = 0.92 + 0.08 * sin(time * 0.7 + vUv.y * 6.0);
      gl_FragColor = vec4(color * intensity * edge * along * flicker, 1.0);
    }
  `,
};

function isVisibleDeep(object: THREE.Object3D | null) {
  let current = object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

// 움직이지 않는 장식 메시를 재질별로 합쳐 드로우콜을 줄입니다.
function mergeStatic(group: THREE.Group) {
  group.updateMatrixWorld(true);
  const inverse = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const remove: THREE.Mesh[] = [];
  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || (mesh as THREE.InstancedMesh).isInstancedMesh) return;
    if (Array.isArray(mesh.material)) return;
    const geometry = (mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()) as THREE.BufferGeometry;
    geometry.clearGroups();
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
    const list = buckets.get(mesh.material) ?? [];
    list.push(geometry);
    buckets.set(mesh.material, list);
    remove.push(mesh);
  });
  remove.forEach((mesh) => {
    mesh.parent?.remove(mesh);
    mesh.geometry.dispose();
  });
  buckets.forEach((geometries, material) => {
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((geometry) => geometry.dispose());
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });
}

export function createEscapeScene(
  container: HTMLElement,
  callbacks: SceneCallbacks,
  options: { quality: Quality; reducedMotion: boolean },
): EscapeSceneHandle {
  let quality = options.quality;
  let reducedMotion = options.reducedMotion;

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: "high-performance",
    alpha: false,
    stencil: false,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = "escape-canvas";
  canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);

  const tooltip = document.createElement("div");
  tooltip.className = "escape-tooltip";
  tooltip.setAttribute("aria-hidden", "true");
  container.appendChild(tooltip);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060b);
  const camera = new THREE.PerspectiveCamera(55, 16 / 10, 0.05, 40);
  camera.position.copy(OVERVIEW_POS);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envTexture = pmrem.fromScene(roomEnv, 0.04).texture;
  roomEnv.dispose();
  scene.environment = envTexture;
  scene.environmentIntensity = 0.16;

  const tex = createTextures();
  const lcd = createLcd();

  // ---------- 재질 ----------
  const woodMat = (color: number, roughness = 0.55, repeat = 1) => {
    const map = tex.woodMap.clone();
    map.repeat.set(repeat, repeat);
    const bump = tex.woodBumpMap.clone();
    bump.repeat.set(repeat, repeat);
    return new THREE.MeshStandardMaterial({ color, map, bumpMap: bump, bumpScale: 0.35, roughness, metalness: 0 });
  };
  const M = {
    darkWood: woodMat(0x4a2d1c, 0.5),
    midWood: woodMat(0x7a4d2e, 0.55),
    paneling: woodMat(0x3a2418, 0.62, 2),
    blackWood: woodMat(0x241611, 0.45),
    brass: new THREE.MeshStandardMaterial({ color: 0xc9a153, metalness: 1, roughness: 0.3 }),
    oldBrass: new THREE.MeshStandardMaterial({ color: 0x9c7a3c, metalness: 1, roughness: 0.45 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x2b2b30, metalness: 0.85, roughness: 0.5 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x5d6368, metalness: 0.8, roughness: 0.38 }),
    panelMetal: new THREE.MeshStandardMaterial({ color: 0x3b4640, metalness: 0.6, roughness: 0.55 }),
    darkPlastic: new THREE.MeshStandardMaterial({ color: 0x15171a, metalness: 0.1, roughness: 0.45 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x5a2e1d, roughness: 0.72 }),
    velvet: new THREE.MeshStandardMaterial({ color: 0x5a0f1a, roughness: 0.95 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xe6d7b3, roughness: 0.9 }),
    wax: new THREE.MeshStandardMaterial({ color: 0xeee2c8, roughness: 0.6, emissive: 0x3a1a05, emissiveIntensity: 0.4 }),
    lacquer: new THREE.MeshStandardMaterial({ color: 0x14203d, metalness: 0.35, roughness: 0.28 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.95 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xbfd4ff,
      metalness: 0,
      roughness: 0.05,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    }),
  };
  const wallMap = tex.wallMap.clone();
  wallMap.repeat.set(1, 1);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.88, color: 0xd6e2e6 });
  const floorMat = new THREE.MeshStandardMaterial({
    map: tex.floorMap,
    bumpMap: tex.floorBumpMap,
    bumpScale: 1.4,
    roughness: 0.4,
    color: 0xb08d70,
  });

  const room = new THREE.Group();
  scene.add(room);

  const hotspotRoots = new Map<HotspotId, THREE.Object3D>();
  const pickRoots: THREE.Object3D[] = [];
  const tag = (object: THREE.Object3D, id: HotspotId) => {
    object.userData.hotspot = id;
    if (!hotspotRoots.has(id)) hotspotRoots.set(id, object);
    return object;
  };
  const pickable = (object: THREE.Object3D) => {
    pickRoots.push(object);
    return object;
  };

  const shadowed = <T extends THREE.Mesh>(mesh: T) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };
  const box = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) => {
    const mesh = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material));
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const rbox = (
    w: number,
    h: number,
    d: number,
    r: number,
    material: THREE.Material | THREE.Material[],
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D,
  ) => {
    const mesh = shadowed(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, r), material));
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const cyl = (
    rt: number,
    rb: number,
    h: number,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D,
    segments = 24,
  ) => {
    const mesh = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segments), material));
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const beam = (from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material, parent: THREE.Object3D) => {
    const direction = new THREE.Vector3().subVectors(to, from);
    const mesh = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 12), material));
    mesh.position.copy(from).addScaledVector(direction, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    parent.add(mesh);
    return mesh;
  };

  // ---------- 방 구조 ----------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  room.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), M.ceiling);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM.height;
  ceiling.receiveShadow = true;
  ceiling.castShadow = true;
  room.add(ceiling);

  const DOOR = { left: -0.17, right: 0.87, top: 2.16 };
  const WINDOW = { z: -0.3, y: 1.75, r: 0.68 };

  const makeWall = (shape: THREE.Shape) => {
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), wallMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };
  {
    const north = new THREE.Shape();
    north.moveTo(-3, 0);
    north.lineTo(DOOR.left, 0);
    north.lineTo(DOOR.left, DOOR.top);
    north.lineTo(DOOR.right, DOOR.top);
    north.lineTo(DOOR.right, 0);
    north.lineTo(3, 0);
    north.lineTo(3, ROOM.height);
    north.lineTo(-3, ROOM.height);
    north.closePath();
    const northWall = makeWall(north);
    northWall.position.z = ROOM.minZ;
    room.add(northWall);

    const southWall = makeWall(new THREE.Shape([new THREE.Vector2(-3, 0), new THREE.Vector2(3, 0), new THREE.Vector2(3, ROOM.height), new THREE.Vector2(-3, ROOM.height)]));
    southWall.position.z = ROOM.maxZ;
    southWall.rotation.y = Math.PI;
    room.add(southWall);

    const westWall = makeWall(new THREE.Shape([new THREE.Vector2(-2.5, 0), new THREE.Vector2(2.5, 0), new THREE.Vector2(2.5, ROOM.height), new THREE.Vector2(-2.5, ROOM.height)]));
    westWall.position.x = ROOM.minX;
    westWall.rotation.y = Math.PI / 2;
    room.add(westWall);

    const east = new THREE.Shape([new THREE.Vector2(-2.5, 0), new THREE.Vector2(2.5, 0), new THREE.Vector2(2.5, ROOM.height), new THREE.Vector2(-2.5, ROOM.height)]);
    const hole = new THREE.Path();
    hole.absarc(WINDOW.z, WINDOW.y, WINDOW.r, 0, Math.PI * 2, true);
    east.holes.push(hole);
    const eastWall = makeWall(east);
    eastWall.position.x = ROOM.maxX;
    eastWall.rotation.y = -Math.PI / 2;
    room.add(eastWall);

    // 창 둘레의 벽 두께
    const reveal = new THREE.Mesh(new THREE.CylinderGeometry(WINDOW.r, WINDOW.r, 0.28, 48, 1, true), M.paneling);
    reveal.rotation.z = Math.PI / 2;
    reveal.position.set(ROOM.maxX + 0.14, WINDOW.y, WINDOW.z);
    (reveal.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    reveal.receiveShadow = true;
    room.add(reveal);
  }

  // 징두리 판벽, 걸레받이, 몰딩, 천장 들보
  {
    const trim = new THREE.Group();
    room.add(trim);
    type WallRun = { axis: "x" | "z"; fixed: number; from: number; to: number; inward: number };
    const runs: WallRun[] = [
      { axis: "x", fixed: ROOM.minZ, from: -3, to: DOOR.left - 0.09, inward: 1 },
      { axis: "x", fixed: ROOM.minZ, from: DOOR.right + 0.09, to: 3, inward: 1 },
      { axis: "x", fixed: ROOM.maxZ, from: -3, to: 3, inward: -1 },
      { axis: "z", fixed: ROOM.minX, from: -2.5, to: 2.5, inward: 1 },
      { axis: "z", fixed: ROOM.maxX, from: -2.5, to: 2.5, inward: -1 },
    ];
    runs.forEach((run) => {
      const length = run.to - run.from;
      const mid = (run.from + run.to) / 2;
      const place = (mesh: THREE.Mesh, along: number, y: number, depth: number) => {
        if (run.axis === "x") mesh.position.set(along, y, run.fixed + run.inward * depth);
        else {
          mesh.position.set(run.fixed + run.inward * depth, y, along);
          mesh.rotation.y = Math.PI / 2;
        }
        trim.add(mesh);
      };
      place(new THREE.Mesh(new THREE.BoxGeometry(length, 0.95, 0.02), M.paneling), mid, 0.475, 0.01);
      place(new THREE.Mesh(new THREE.BoxGeometry(length, 0.055, 0.045), M.darkWood), mid, 0.955, 0.022);
      place(new THREE.Mesh(new THREE.BoxGeometry(length, 0.15, 0.03), M.blackWood), mid, 0.075, 0.025);
      place(new THREE.Mesh(new THREE.BoxGeometry(length, 0.09, 0.07), M.darkWood), mid, ROOM.height - 0.045, 0.035);
      const panels = Math.max(1, Math.round(length / 0.62));
      const step = length / panels;
      for (let i = 0; i <= panels; i += 1) {
        place(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.72, 0.018), M.darkWood), run.from + i * step, 0.53, 0.028);
      }
      place(new THREE.Mesh(new THREE.BoxGeometry(length, 0.045, 0.018), M.darkWood), mid, 0.17, 0.028);
      place(new THREE.Mesh(new THREE.BoxGeometry(length, 0.045, 0.018), M.darkWood), mid, 0.89, 0.028);
    });
    [-1.9, 0, 1.9].forEach((x) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 5), M.blackWood);
      mesh.position.set(x, ROOM.height - 0.1, 0);
      trim.add(mesh);
    });
    mergeStatic(trim);
  }

  // ---------- 문 + 복도 빛 ----------
  const doorPivot = new THREE.Group();
  const hallLight = new THREE.PointLight(0xffd9a8, 0, 9, 2);
  const hallMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.02, 0.016, 0.012), toneMapped: false });
  {
    const doorGroup = new THREE.Group();
    room.add(doorGroup);
    tag(doorGroup, "door");
    pickable(doorGroup);
    const frame = new THREE.Group();
    doorGroup.add(frame);
    const cx = (DOOR.left + DOOR.right) / 2;
    box(0.1, DOOR.top + 0.1, 0.1, M.darkWood, DOOR.left - 0.05, (DOOR.top + 0.1) / 2, ROOM.minZ + 0.03, frame);
    box(0.1, DOOR.top + 0.1, 0.1, M.darkWood, DOOR.right + 0.05, (DOOR.top + 0.1) / 2, ROOM.minZ + 0.03, frame);
    box(DOOR.right - DOOR.left + 0.3, 0.12, 0.12, M.darkWood, cx, DOOR.top + 0.06, ROOM.minZ + 0.035, frame);
    box(DOOR.right - DOOR.left + 0.4, 0.05, 0.14, M.darkWood, cx, DOOR.top + 0.15, ROOM.minZ + 0.04, frame);
    mergeStatic(frame);

    doorPivot.position.set(DOOR.left + 0.01, 0, ROOM.minZ - 0.02);
    doorGroup.add(doorPivot);
    const width = DOOR.right - DOOR.left - 0.02;
    const leaf = new THREE.Group();
    leaf.position.set(width / 2, 0, 0);
    doorPivot.add(leaf);
    rbox(width, DOOR.top - 0.02, 0.055, 0.01, M.midWood, 0, (DOOR.top - 0.02) / 2, 0, leaf);
    [1.52, 0.62].forEach((y) => {
      [-0.23, 0.23].forEach((x) => rbox(0.36, 0.72, 0.02, 0.008, M.darkWood, x, y, 0.03, leaf));
    });
    const handle = new THREE.Group();
    handle.position.set(width / 2 - 0.1, 1.02, 0.04);
    leaf.add(handle);
    rbox(0.05, 0.2, 0.015, 0.006, M.brass, 0, 0, 0, handle);
    cyl(0.012, 0.012, 0.05, M.brass, 0, 0.04, 0.03, handle).rotation.x = Math.PI / 2;
    rbox(0.13, 0.022, 0.022, 0.01, M.brass, -0.055, 0.04, 0.055, handle);
    cyl(0.008, 0.008, 0.01, M.iron, 0, -0.05, 0.012, handle).rotation.x = Math.PI / 2;
    [0.3, DOOR.top - 0.35].forEach((y) => box(0.02, 0.12, 0.03, M.brass, -width / 2 + 0.01, y, 0.02, leaf));

    // 문 너머 복도 (문이 열리면 빛이 쏟아짐)
    const hall = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6), hallMat);
    hall.position.set(cx, 1.2, ROOM.minZ - 0.9);
    room.add(hall);
    const hallSide = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 0.9), new THREE.MeshStandardMaterial({ color: 0x3a2c22, side: THREE.BackSide, roughness: 0.9 }));
    hallSide.position.set(cx, 1.15, ROOM.minZ - 0.47);
    room.add(hallSide);
    hallLight.position.set(cx, 1.4, ROOM.minZ - 0.5);
    room.add(hallLight);
  }

  // ---------- 도어락 ----------
  const keypadButtons = new Map<string, THREE.Mesh>();
  const keypadLedMat = new THREE.MeshBasicMaterial({ color: 0x220808, toneMapped: false });
  const lcdMat = new THREE.MeshBasicMaterial({ map: lcd.texture, toneMapped: false, color: new THREE.Color(1, 1, 1) });
  const keypadGlow = new THREE.PointLight(0x7dffb0, 0, 1.4, 2);
  {
    const keypad = new THREE.Group();
    keypad.position.set(1.2, 1.3, ROOM.minZ + 0.02);
    room.add(keypad);
    tag(keypad, "keypad");
    pickable(keypad);
    rbox(0.3, 0.44, 0.045, 0.015, M.panelMetal, 0, 0, 0.02, keypad);
    rbox(0.26, 0.09, 0.01, 0.006, M.darkPlastic, 0, 0.14, 0.045, keypad);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.235, 0.075), lcdMat);
    screen.position.set(0, 0.14, 0.0512);
    keypad.add(screen);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 8), keypadLedMat);
    led.position.set(0.115, 0.197, 0.045);
    keypad.add(led);
    keypadGlow.position.set(0, 0.1, 0.2);
    keypad.add(keypadGlow);
    const labels = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "enter"];
    labels.forEach((label, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const face = document.createElement("canvas");
      face.width = 96;
      face.height = 96;
      const ctx = face.getContext("2d");
      if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 96);
        gradient.addColorStop(0, "#4d5751");
        gradient.addColorStop(1, "#2c332f");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 96, 96);
        ctx.fillStyle = label === "enter" ? "#9dffc2" : label === "clear" ? "#ffb59d" : "#f2f2ea";
        ctx.font = `700 ${label.length > 1 ? 44 : 54}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label === "enter" ? "✓" : label === "clear" ? "C" : label, 48, 52);
      }
      const faceTexture = new THREE.CanvasTexture(face);
      faceTexture.colorSpace = THREE.SRGBColorSpace;
      const faceMat = new THREE.MeshStandardMaterial({ map: faceTexture, roughness: 0.5, metalness: 0.2 });
      const button = rbox(0.064, 0.056, 0.022, 0.008, [M.steel, M.steel, M.steel, M.steel, faceMat, M.steel], (col - 1) * 0.078, 0.045 - row * 0.068, 0.05, keypad);
      tag(button, `key-${label}` as HotspotId);
      keypadButtons.set(label, button);
    });
  }

  // ---------- 퓨즈함 ----------
  const fuseLedMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.2, 0.15), toneMapped: false });
  const installedFuse = new THREE.Group();
  {
    const fuseBox = new THREE.Group();
    fuseBox.position.set(1.84, 1.36, ROOM.minZ + 0.07);
    room.add(fuseBox);
    tag(fuseBox, "fuseBox");
    pickable(fuseBox);
    rbox(0.36, 0.46, 0.12, 0.01, M.panelMetal, 0, 0, 0, fuseBox);
    box(0.3, 0.38, 0.01, M.darkPlastic, 0, -0.01, 0.056, fuseBox);
    const lid = new THREE.Group();
    lid.position.set(-0.18, 0, 0.062);
    lid.rotation.y = -1.9;
    fuseBox.add(lid);
    rbox(0.35, 0.44, 0.015, 0.005, M.panelMetal, 0.175, 0, 0, lid);
    const warning = document.createElement("canvas");
    warning.width = 128;
    warning.height = 128;
    const wctx = warning.getContext("2d");
    if (wctx) {
      wctx.fillStyle = "#e0b83a";
      wctx.beginPath();
      wctx.moveTo(64, 10);
      wctx.lineTo(120, 112);
      wctx.lineTo(8, 112);
      wctx.closePath();
      wctx.fill();
      wctx.fillStyle = "#1a1a1a";
      wctx.font = "900 70px system-ui, sans-serif";
      wctx.textAlign = "center";
      wctx.fillText("⚡", 64, 100);
    }
    const warnTexture = new THREE.CanvasTexture(warning);
    warnTexture.colorSpace = THREE.SRGBColorSpace;
    const warnPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), new THREE.MeshStandardMaterial({ map: warnTexture, transparent: true, roughness: 0.6 }));
    warnPlane.position.set(0.175, 0.08, -0.009);
    warnPlane.rotation.y = Math.PI;
    lid.add(warnPlane);
    const fuseModel = (parent: THREE.Object3D, x: number) => {
      const fuse = new THREE.Group();
      fuse.position.set(x, -0.02, 0.075);
      parent.add(fuse);
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.07, 16), new THREE.MeshPhysicalMaterial({ color: 0xdfeee8, transparent: true, opacity: 0.45, roughness: 0.05 }));
      fuse.add(glass);
      cyl(0.0155, 0.0155, 0.016, M.brass, 0, 0.04, 0, fuse);
      cyl(0.0155, 0.0155, 0.016, M.brass, 0, -0.04, 0, fuse);
      cyl(0.002, 0.002, 0.07, M.steel, 0, 0, 0, fuse, 6);
      return fuse;
    };
    [-0.08, 0].forEach((x) => fuseModel(fuseBox, x));
    installedFuse.add(fuseModel(new THREE.Group(), 0));
    installedFuse.position.set(0.08, 0, 0);
    fuseBox.add(installedFuse);
    [-0.08, 0, 0.08].forEach((x) => {
      box(0.036, 0.012, 0.02, M.darkPlastic, x, 0.03, 0.068, fuseBox);
      box(0.036, 0.012, 0.02, M.darkPlastic, x, -0.07, 0.068, fuseBox);
    });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), fuseLedMat);
    led.position.set(0.12, 0.19, 0.065);
    fuseBox.add(led);
    beam(new THREE.Vector3(1.84, 1.59, ROOM.minZ + 0.03), new THREE.Vector3(1.84, ROOM.height, ROOM.minZ + 0.03), 0.018, M.iron, room);
  }

  // ---------- 벽시계 + 콘솔 테이블 + 촛대 ----------
  const candleLight = new THREE.PointLight(0xff9a48, 2.2, 5, 2);
  const flames: THREE.Mesh[] = [];
  const flameGlows: THREE.Sprite[] = [];
  const clockUVMat = new THREE.MeshBasicMaterial({
    map: tex.clockUVMap,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    color: new THREE.Color(2.2, 2.2, 2.4),
  });
  const clockUV = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.194), clockUVMat);
  {
    const clock = new THREE.Group();
    clock.position.set(-1.55, 2.08, ROOM.minZ + 0.04);
    room.add(clock);
    tag(clock, "clock");
    pickable(clock);
    const rim = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.04, 16, 64), M.darkWood));
    clock.add(rim);
    cyl(0.33, 0.33, 0.05, M.darkWood, 0, 0, -0.02, clock, 48).rotation.x = Math.PI / 2;
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.3, 64), new THREE.MeshStandardMaterial({ map: tex.clockMap, roughness: 0.6 }));
    face.position.z = 0.006;
    face.receiveShadow = true;
    clock.add(face);
    const hand = (length: number, width: number, angle: number, z: number) => {
      const geometry = new THREE.BoxGeometry(width, length, 0.006);
      geometry.translate(0, length / 2 - 0.03, 0);
      const mesh = shadowed(new THREE.Mesh(geometry, M.iron));
      mesh.position.z = z;
      mesh.rotation.z = -angle;
      clock.add(mesh);
    };
    const minute = (40 / 60) * Math.PI * 2;
    const hour = ((9 + 40 / 60) / 12) * Math.PI * 2;
    hand(0.17, 0.022, hour, 0.014);
    hand(0.25, 0.013, minute, 0.02);
    cyl(0.018, 0.018, 0.012, M.brass, 0, 0, 0.024, clock).rotation.x = Math.PI / 2;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.31, 32, 12, 0, Math.PI * 2, 0, 0.45), M.glass);
    dome.rotation.x = Math.PI / 2;
    dome.position.z = -0.24;
    clock.add(dome);
    clockUV.position.set(-1.55, 1.63, ROOM.minZ + 0.012);
    room.add(clockUV);

    const consoleTable = new THREE.Group();
    consoleTable.position.set(-1.55, 0, ROOM.minZ + 0.24);
    room.add(consoleTable);
    const tableStatic = new THREE.Group();
    consoleTable.add(tableStatic);
    rbox(1.05, 0.045, 0.4, 0.01, M.darkWood, 0, 0.8, 0, tableStatic);
    box(0.95, 0.1, 0.34, M.darkWood, 0, 0.72, 0, tableStatic);
    [
      [-0.47, -0.15],
      [0.47, -0.15],
      [-0.47, 0.15],
      [0.47, 0.15],
    ].forEach(([x, z]) => cyl(0.022, 0.016, 0.7, M.darkWood, x, 0.35, z, tableStatic, 12));
    box(0.9, 0.025, 0.3, M.darkWood, 0, 0.18, 0, tableStatic);
    rbox(0.22, 0.05, 0.16, 0.01, M.leather, 0.3, 0.845, 0.02, tableStatic);
    rbox(0.2, 0.04, 0.15, 0.01, M.velvet, 0.31, 0.89, 0.02, tableStatic);
    mergeStatic(tableStatic);

    const candles = new THREE.Group();
    candles.position.set(-0.2, 0.823, 0);
    consoleTable.add(candles);
    tag(candles, "candles");
    pickable(candles);
    cyl(0.1, 0.12, 0.02, M.oldBrass, 0, 0.01, 0, candles, 32);
    const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 2.6, 0.9), toneMapped: false });
    [
      [-0.055, 0.2, -0.02],
      [0.04, 0.28, 0.02],
      [0.08, 0.15, -0.04],
    ].forEach(([x, h, z]) => {
      cyl(0.022, 0.024, h, M.wax, x, 0.02 + h / 2, z, candles, 20);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 10), flameMat);
      flame.scale.set(1, 2.4, 1);
      flame.position.set(x, 0.02 + h + 0.028, z);
      candles.add(flame);
      flames.push(flame);
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: tex.dotMap, color: 0xffa050, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }),
      );
      glow.scale.setScalar(0.16);
      glow.position.copy(flame.position);
      candles.add(glow);
      flameGlows.push(glow);
    });
    candleLight.position.set(-1.6, 1.14, ROOM.minZ + 0.4);
    room.add(candleLight);
  }

  // ---------- 책상 (서쪽 벽) ----------
  const drawer = new THREE.Group();
  const drawerItems = new THREE.Group();
  const lampLight = new THREE.SpotLight(0xffc98a, 4, 3.2, 0.95, 0.7, 2);
  const lampShadeMat = new THREE.MeshStandardMaterial({ color: 0x1d6a3a, emissive: 0x2f9a55, emissiveIntensity: 0.9, roughness: 0.22, metalness: 0.1, side: THREE.DoubleSide });
  const bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 4.6, 3), toneMapped: false });
  const globeSpin = new THREE.Group();
  const posterUVMat = new THREE.MeshBasicMaterial({
    map: tex.posterUVMap,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    color: new THREE.Color(2.2, 2.2, 2.4),
  });
  const posterUV = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.656), posterUVMat);
  {
    const desk = new THREE.Group();
    desk.position.set(-2.58, 0, 0.15);
    room.add(desk);
    tag(desk, "desk");
    pickable(desk);
    const deskStatic = new THREE.Group();
    desk.add(deskStatic);
    rbox(0.82, 0.05, 1.7, 0.015, M.darkWood, 0, 0.76, 0, deskStatic);
    [-0.6, 0.6].forEach((z) => {
      rbox(0.74, 0.7, 0.4, 0.01, M.darkWood, -0.02, 0.37, z, deskStatic);
      [0.58, 0.36, 0.14].forEach((y) => {
        rbox(0.02, 0.19, 0.34, 0.006, M.midWood, 0.36, y, z, deskStatic);
        cyl(0.012, 0.012, 0.03, M.brass, 0.38, y, z, deskStatic, 12).rotation.z = Math.PI / 2;
      });
    });
    box(0.02, 0.55, 0.8, M.darkWood, -0.38, 0.4, 0, deskStatic);
    rbox(0.45, 0.003, 0.6, 0.001, new THREE.MeshStandardMaterial({ color: 0x264d34, roughness: 0.85 }), 0.05, 0.786, -0.05, deskStatic);
    mergeStatic(deskStatic);

    // 가운데 서랍
    drawer.position.set(0, 0, 0);
    desk.add(drawer);
    tag(drawer, "drawer");
    rbox(0.03, 0.115, 0.4, 0.006, M.midWood, 0.385, 0.66, 0, drawer);
    box(0.5, 0.012, 0.38, M.darkWood, 0.14, 0.607, 0, drawer);
    box(0.5, 0.08, 0.012, M.darkWood, 0.14, 0.645, 0.185, drawer);
    box(0.5, 0.08, 0.012, M.darkWood, 0.14, 0.645, -0.185, drawer);
    box(0.012, 0.08, 0.38, M.darkWood, -0.11, 0.645, 0, drawer);
    cyl(0.018, 0.018, 0.006, M.brass, 0.402, 0.66, 0, drawer, 20).rotation.z = Math.PI / 2;
    cyl(0.005, 0.005, 0.008, M.iron, 0.405, 0.66, 0, drawer, 8).rotation.z = Math.PI / 2;
    rbox(0.012, 0.022, 0.08, 0.005, M.brass, 0.41, 0.66, 0.1, drawer);
    drawer.add(drawerItems);
    tag(drawerItems, "drawerItems");
    const journal = rbox(0.2, 0.028, 0.15, 0.008, M.leather, 0.12, 0.628, -0.07, drawerItems);
    journal.rotation.y = 0.2;
    box(0.19, 0.022, 0.004, M.paper, 0.12, 0.628, 0.006, drawerItems).rotation.y = 0.2;
    const flashlight = new THREE.Group();
    flashlight.position.set(0.15, 0.63, 0.09);
    flashlight.rotation.set(0, 0.5, Math.PI / 2);
    drawerItems.add(flashlight);
    cyl(0.016, 0.016, 0.13, M.darkPlastic, 0, 0, 0, flashlight, 16);
    cyl(0.022, 0.017, 0.035, M.steel, 0, 0.08, 0, flashlight, 16);
    const uvLens = new THREE.Mesh(new THREE.CircleGeometry(0.019, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 0.3, 1.6), toneMapped: false }));
    uvLens.rotation.x = -Math.PI / 2;
    uvLens.position.y = 0.098;
    flashlight.add(uvLens);

    // 뱅커스 램프
    const lamp = new THREE.Group();
    lamp.position.set(-0.18, 0.785, -0.58);
    desk.add(lamp);
    tag(lamp, "lamp");
    pickable(lamp);
    cyl(0.085, 0.095, 0.02, M.brass, 0, 0.01, 0, lamp, 32);
    cyl(0.009, 0.009, 0.3, M.brass, 0, 0.16, 0, lamp, 12);
    const shadeGeometry = new THREE.CylinderGeometry(0.075, 0.075, 0.3, 32, 1, true, 0, Math.PI);
    shadeGeometry.rotateX(Math.PI / 2).rotateZ(Math.PI / 2);
    const shade = new THREE.Mesh(shadeGeometry, lampShadeMat);
    shade.position.set(0.04, 0.3, 0);
    shade.castShadow = true;
    lamp.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), bulbMat);
    bulb.position.set(0.04, 0.3, 0);
    lamp.add(bulb);
    cyl(0.004, 0.004, 0.08, M.brass, 0.1, 0.24, 0.06, lamp, 6);
    lampLight.position.set(-2.72, 1.08, -0.43);
    lampLight.target.position.set(-2.45, 0.78, -0.25);
    room.add(lampLight);
    room.add(lampLight.target);

    // 지구본
    const globe = new THREE.Group();
    globe.position.set(-0.12, 0.785, 0.58);
    desk.add(globe);
    tag(globe, "globe");
    pickable(globe);
    cyl(0.07, 0.085, 0.025, M.darkWood, 0, 0.0125, 0, globe, 24);
    cyl(0.01, 0.014, 0.12, M.oldBrass, 0, 0.08, 0, globe, 12);
    const tilt = new THREE.Group();
    tilt.position.y = 0.3;
    tilt.rotation.z = 0.41;
    globe.add(tilt);
    tilt.add(globeSpin);
    const sphere = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.15, 48, 32), new THREE.MeshStandardMaterial({ map: tex.globeMap, roughness: 0.45, metalness: 0.05 })));
    globeSpin.add(sphere);
    const meridian = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.168, 0.006, 8, 48, Math.PI * 1.2), M.oldBrass));
    meridian.rotation.z = -Math.PI * 0.1;
    tilt.add(meridian);

    // 책상 위 소품
    const props = new THREE.Group();
    desk.add(props);
    [0, 1, 2].forEach((i) => {
      const sheet = box(0.21, 0.002, 0.29, M.paper, 0.1 + i * 0.015, 0.788 + i * 0.002, 0.05 + i * 0.03, props);
      sheet.rotation.y = -0.15 + i * 0.12;
    });
    cyl(0.03, 0.035, 0.05, new THREE.MeshPhysicalMaterial({ color: 0x0a0f18, roughness: 0.1, metalness: 0.1 }), 0.22, 0.81, -0.28, props, 16);
    beam(new THREE.Vector3(0.22, 0.83, -0.28), new THREE.Vector3(0.3, 1.02, -0.2), 0.003, M.paper, props);
    [0, 1, 2].forEach((i) => rbox(0.17 - i * 0.01, 0.04, 0.24, 0.006, [M.leather, M.velvet, M.darkWood][i], -0.22, 0.806 + i * 0.041, 0.2, props));

    // 달의 위상 포스터
    const poster = new THREE.Group();
    poster.position.set(ROOM.minX + 0.03, 1.8, 0.15);
    poster.rotation.y = Math.PI / 2;
    room.add(poster);
    tag(poster, "moonPoster");
    pickable(poster);
    const posterPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.656), new THREE.MeshStandardMaterial({ map: tex.posterMap, roughness: 0.85 }));
    posterPlane.position.z = 0.012;
    posterPlane.receiveShadow = true;
    poster.add(posterPlane);
    const frame = new THREE.Group();
    poster.add(frame);
    box(1.5, 0.05, 0.035, M.blackWood, 0, 0.353, 0.012, frame);
    box(1.5, 0.05, 0.035, M.blackWood, 0, -0.353, 0.012, frame);
    box(0.05, 0.756, 0.035, M.blackWood, -0.725, 0, 0.012, frame);
    box(0.05, 0.756, 0.035, M.blackWood, 0.725, 0, 0.012, frame);
    mergeStatic(frame);
    posterUV.position.z = 0.016;
    poster.add(posterUV);

    // 의자
    const chair = new THREE.Group();
    chair.position.set(-1.92, 0, 1.05);
    chair.rotation.y = Math.PI / 2 + 0.75;
    room.add(chair);
    rbox(0.46, 0.05, 0.44, 0.015, M.darkWood, 0, 0.47, 0, chair);
    rbox(0.42, 0.03, 0.4, 0.015, M.velvet, 0, 0.505, 0, chair);
    [
      [-0.2, -0.19],
      [0.2, -0.19],
      [-0.2, 0.19],
      [0.2, 0.19],
    ].forEach(([x, z]) => cyl(0.02, 0.017, 0.45, M.darkWood, x, 0.225, z, chair, 10));
    [-0.2, 0.2].forEach((x) => cyl(0.018, 0.02, 0.5, M.darkWood, x, 0.74, 0.2, chair, 10));
    rbox(0.44, 0.08, 0.03, 0.01, M.darkWood, 0, 0.96, 0.2, chair);
    [-0.1, 0, 0.1].forEach((x) => box(0.035, 0.36, 0.02, M.darkWood, x, 0.74, 0.2, chair));
    mergeStatic(chair);
  }

  // ---------- 책장 (남쪽 벽) ----------
  const puzzleBooks: THREE.Mesh[] = [];
  const compartmentDoor = new THREE.Group();
  const compartmentItems = new THREE.Group();
  {
    const shelf = new THREE.Group();
    shelf.position.set(-1.0, 0, ROOM.maxZ - 0.2);
    room.add(shelf);
    tag(shelf, "bookshelf");
    pickable(shelf);
    const frame = new THREE.Group();
    shelf.add(frame);
    const W = 1.9;
    const H = 2.3;
    const D = 0.38;
    box(0.045, H, D, M.darkWood, -W / 2, H / 2, 0, frame);
    box(0.045, H, D, M.darkWood, W / 2, H / 2, 0, frame);
    box(W + 0.12, 0.06, D + 0.04, M.darkWood, 0, H + 0.03, -0.01, frame);
    box(W + 0.02, 0.1, D, M.darkWood, 0, 0.05, 0, frame);
    box(W, H, 0.02, M.blackWood, 0, H / 2, D / 2 - 0.01, frame);
    const shelfYs = [0.62, 1.12, 1.62, 2.12];
    shelfYs.forEach((y) => box(W - 0.04, 0.03, D - 0.02, M.darkWood, 0, y - 0.015, 0, frame));
    box(0.03, 0.52, D - 0.02, M.darkWood, 0, 0.36, 0, frame);
    mergeStatic(frame);

    // 채움 책 (인스턴싱)
    const random = (() => {
      let seed = 1234;
      return () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };
    })();
    const palette = [0x5b1d1a, 0x1f2c4a, 0x24422f, 0x4f3322, 0x6d5424, 0x2a2622, 0x3d2a4a, 0x70422a];
    type Slot = { x: number; y: number; w: number; h: number; d: number; lean: number; color: number };
    const slots: Slot[] = [];
    const fillRow = (y: number, from: number, to: number) => {
      let x = from;
      while (x < to - 0.03) {
        const w = 0.028 + random() * 0.035;
        if (x + w > to) break;
        const h = 0.22 + random() * 0.14;
        const lean = random() < 0.06 ? (random() - 0.5) * 0.25 : 0;
        slots.push({ x: x + w / 2, y, w, h, d: 0.2 + random() * 0.08, lean, color: palette[Math.floor(random() * palette.length)] });
        x += w + 0.002;
      }
    };
    fillRow(1.62, -0.92, -0.2);
    fillRow(1.62, 0.25, 0.92);
    fillRow(2.12, -0.92, 0.3);
    fillRow(1.12, -0.92, -0.26);
    fillRow(1.12, 0.26, 0.92);
    fillRow(0.62, -0.92, 0.1);
    fillRow(0.62, 0.55, 0.92);
    const bookMat = new THREE.MeshStandardMaterial({ map: tex.plainSpine, roughness: 0.75 });
    const instanced = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), bookMat, slots.length);
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const color = new THREE.Color();
    slots.forEach((slot, index) => {
      quaternion.setFromEuler(new THREE.Euler(0, 0, slot.lean));
      matrix.compose(new THREE.Vector3(slot.x, slot.y + slot.h / 2, -D / 2 + slot.d / 2 + 0.03), quaternion, new THREE.Vector3(slot.w, slot.h, slot.d));
      instanced.setMatrixAt(index, matrix);
      instanced.setColorAt(index, color.setHex(slot.color));
    });
    instanced.castShadow = true;
    instanced.receiveShadow = true;
    shelf.add(instanced);

    // 퍼즐 책 5권 (책등이 방 쪽 -z)
    const plainSide = new THREE.MeshStandardMaterial({ color: 0xd9ccb0, roughness: 0.9 });
    BOOKS.forEach((book, index) => {
      const cover = new THREE.MeshStandardMaterial({ color: book.hex, roughness: 0.6 });
      const spine = new THREE.MeshStandardMaterial({ map: tex.bookSpines[index], roughness: 0.55 });
      const mesh = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.34, 0.25), [cover, cover, plainSide, plainSide, cover, spine]));
      mesh.position.set(-0.2 + index * 0.1 + 0.005, 1.12 + 0.17, -D / 2 + 0.125 + 0.02);
      shelf.add(mesh);
      tag(mesh, `book-${index}` as HotspotId);
      puzzleBooks.push(mesh);
    });

    // 장식: 모래시계, 수정구
    const hourglass = new THREE.Group();
    hourglass.position.set(0.02, 1.62, -0.02);
    shelf.add(hourglass);
    cyl(0.07, 0.07, 0.015, M.darkWood, 0, 0.008, 0, hourglass, 20);
    cyl(0.07, 0.07, 0.015, M.darkWood, 0, 0.23, 0, hourglass, 20);
    const glassTop = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 20, 1, true), M.glass);
    glassTop.position.y = 0.17;
    glassTop.rotation.x = Math.PI;
    hourglass.add(glassTop);
    const glassBottom = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 20, 1, true), M.glass);
    glassBottom.position.y = 0.065;
    hourglass.add(glassBottom);
    const sand = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.04, 16), new THREE.MeshStandardMaterial({ color: 0xd8b775, roughness: 0.9 }));
    sand.position.y = 0.035;
    hourglass.add(sand);
    [-0.06, 0.06].forEach((x) => cyl(0.006, 0.006, 0.22, M.darkWood, x, 0.12, 0, hourglass, 8));
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 32, 24),
      new THREE.MeshPhysicalMaterial({ color: 0x9fc2ff, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.55 }),
    );
    orb.position.set(0.5, 2.12 + 0.1, -0.02);
    shelf.add(orb);
    cyl(0.045, 0.055, 0.03, M.brass, 0.5, 2.135, -0.02, shelf, 20);

    // 아래 칸: 여닫이 판 두 개, 오른쪽이 비밀 칸
    rbox(0.88, 0.44, 0.022, 0.008, M.midWood, -0.47, 0.36, -D / 2 - 0.005, shelf);
    cyl(0.014, 0.014, 0.03, M.brass, -0.47, 0.52, -D / 2 - 0.025, shelf, 12).rotation.x = Math.PI / 2;
    compartmentDoor.position.set(0.02, 0.14, -D / 2 - 0.005);
    shelf.add(compartmentDoor);
    tag(compartmentDoor, "compartment");
    rbox(0.86, 0.44, 0.022, 0.008, M.midWood, 0.43, 0.22, 0, compartmentDoor);
    cyl(0.014, 0.014, 0.03, M.brass, 0.43, 0.38, -0.02, compartmentDoor, 12).rotation.x = Math.PI / 2;
    shelf.add(compartmentItems);
    tag(compartmentItems, "compartment");
    compartmentItems.position.set(0.45, 0.1, -0.02);
    const fuseItem = new THREE.Group();
    fuseItem.position.set(0, 0.03, 0);
    fuseItem.rotation.z = Math.PI / 2;
    compartmentItems.add(fuseItem);
    const fuseGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.08, 16), new THREE.MeshPhysicalMaterial({ color: 0xdff4ea, transparent: true, opacity: 0.5, roughness: 0.05 }));
    fuseItem.add(fuseGlass);
    cyl(0.017, 0.017, 0.018, M.brass, 0, 0.045, 0, fuseItem, 16);
    cyl(0.017, 0.017, 0.018, M.brass, 0, -0.045, 0, fuseItem, 16);
    const note = box(0.16, 0.004, 0.12, M.paper, -0.18, 0.012, 0.02, compartmentItems);
    note.rotation.y = 0.3;
    const sconce = new THREE.Group();
    sconce.position.set(0, 2.42, -D / 2 + 0.02);
    shelf.add(sconce);
    rbox(0.5, 0.03, 0.08, 0.01, M.brass, 0, 0, -0.03, sconce);
    const sconceBulb = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.012, 0.02), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.8, 1.2), toneMapped: false }));
    sconceBulb.position.set(0, -0.02, -0.05);
    sconce.add(sconceBulb);
    const shelfLight = new THREE.SpotLight(0xffd29a, 5, 3.4, 0.75, 0.8, 2);
    shelfLight.position.set(-1.0, 2.38, ROOM.maxZ - 0.55);
    shelfLight.target.position.set(-1.0, 1.0, ROOM.maxZ - 0.1);
    room.add(shelfLight);
    room.add(shelfLight.target);
    const itemGlow = new THREE.PointLight(0xffe2a0, 0.25, 0.6, 2);
    itemGlow.position.set(0, 0.2, -0.1);
    compartmentItems.add(itemGlow);
  }

  // ---------- 궤짝 + 성도 ----------
  const lidPivot = new THREE.Group();
  const lanternLights: THREE.PointLight[] = [];
  const dialWindows: Array<ReturnType<typeof createDialWindow>> = [];
  const dials: THREE.Mesh[] = [];
  const lensItem = new THREE.Group();
  {
    const chest = new THREE.Group();
    chest.position.set(1.35, 0, ROOM.maxZ - 0.33);
    room.add(chest);
    tag(chest, "chest");
    pickable(chest);
    const body = new THREE.Group();
    chest.add(body);
    rbox(0.86, 0.42, 0.48, 0.02, M.midWood, 0, 0.23, 0, body);
    [-0.34, 0.34].forEach((x) => {
      box(0.05, 0.43, 0.49, M.iron, x, 0.23, 0, body);
    });
    box(0.87, 0.04, 0.49, M.iron, 0, 0.04, 0, body);
    [
      [-0.43, -0.24],
      [0.43, -0.24],
    ].forEach(([x, z]) => box(0.03, 0.43, 0.03, M.oldBrass, x, 0.23, z, body));
    [-0.2, 0.2].forEach((x) => cyl(0.012, 0.012, 0.06, M.iron, x, 0.3, -0.26, body, 10).rotation.x = Math.PI / 2);
    mergeStatic(body);
    // 안쪽 벨벳
    box(0.8, 0.012, 0.42, M.velvet, 0, 0.444, 0, chest);

    lidPivot.position.set(0, 0.44, 0.24);
    chest.add(lidPivot);
    const lidMat = M.midWood.clone();
    lidMat.side = THREE.DoubleSide;
    const lidGeometry = new THREE.CylinderGeometry(0.24, 0.24, 0.86, 32, 1, false, 0, Math.PI);
    lidGeometry.rotateZ(Math.PI / 2);
    const lid = shadowed(new THREE.Mesh(lidGeometry, lidMat));
    lid.position.set(0, 0, -0.24);
    lid.scale.set(1, 0.55, 1);
    lidPivot.add(lid);
    [-0.34, 0.34].forEach((x) => {
      const bandGeometry = new THREE.CylinderGeometry(0.247, 0.247, 0.05, 32, 1, true, 0, Math.PI);
      bandGeometry.rotateZ(Math.PI / 2);
      const bandMat = M.iron.clone();
      bandMat.side = THREE.DoubleSide;
      const band = shadowed(new THREE.Mesh(bandGeometry, bandMat));
      band.position.set(x, 0, -0.24);
      band.scale.set(1, 0.56, 1);
      lidPivot.add(band);
    });
    // 자물쇠 판 + 달 다이얼 3개 + 읽기 창
    rbox(0.4, 0.27, 0.02, 0.01, M.brass, 0, 0.265, -0.245, chest);
    const dialMat = new THREE.MeshStandardMaterial({ map: tex.dialMap, roughness: 0.5, metalness: 0.2 });
    const dialCap = new THREE.MeshStandardMaterial({ color: 0x9c7a3c, metalness: 1, roughness: 0.35 });
    // 궤짝 앞면은 -z를 보므로, 보는 사람 기준 왼쪽(1번)이 +x입니다.
    [0.105, 0, -0.105].forEach((x, index) => {
      const geometry = new THREE.CylinderGeometry(0.06, 0.06, 0.08, 48);
      geometry.rotateZ(Math.PI / 2);
      const dial = shadowed(new THREE.Mesh(geometry, [dialMat, dialCap, dialCap]));
      dial.position.set(x, 0.315, -0.255);
      chest.add(dial);
      tag(dial, `dial-${index}` as HotspotId);
      dials.push(dial);
      const reading = createDialWindow();
      dialWindows.push(reading);
      const windowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.075, 0.075),
        new THREE.MeshBasicMaterial({ map: reading.texture, color: new THREE.Color(1.25, 1.25, 1.25), toneMapped: false }),
      );
      windowPlane.position.set(x, 0.19, -0.2565);
      windowPlane.rotation.y = Math.PI;
      chest.add(windowPlane);
      tag(windowPlane, `dial-${index}` as HotspotId);
    });
    const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.022, 3), M.brass);
    pointer.rotation.x = Math.PI;
    pointer.position.set(0, 0.39, -0.31);
    chest.add(pointer);
    [-0.105, 0.105].forEach((x) => {
      const p = pointer.clone();
      p.position.x = x;
      chest.add(p);
    });

    chest.add(lensItem);
    tag(lensItem, "lens");
    lensItem.position.set(0.05, 0.45, 0);
    const lensBody = cyl(0.028, 0.03, 0.075, M.brass, 0, 0.03, 0, lensItem, 24);
    lensBody.rotation.z = Math.PI / 2;
    const lensGlass = new THREE.Mesh(new THREE.CircleGeometry(0.024, 24), new THREE.MeshPhysicalMaterial({ color: 0x9ed0ff, roughness: 0, metalness: 0.1, emissive: 0x16304a, emissiveIntensity: 0.6 }));
    lensGlass.rotation.y = Math.PI / 2;
    lensGlass.position.set(0.039, 0.03, 0);
    lensItem.add(lensGlass);

    // 궤짝 옆 등잔: 다이얼을 읽기 쉽게 비춤
    const lantern = new THREE.Group();
    lantern.position.set(0.72, 0, ROOM.maxZ - 0.3);
    room.add(lantern);
    cyl(0.07, 0.08, 0.03, M.iron, 0, 0.015, 0, lantern, 16);
    cyl(0.06, 0.06, 0.02, M.iron, 0, 0.25, 0, lantern, 16);
    const lanternGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.2, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffa040, emissiveIntensity: 1.6, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
    lanternGlass.position.y = 0.13;
    lantern.add(lanternGlass);
    [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].forEach((angle) => cyl(0.004, 0.004, 0.22, M.iron, Math.cos(angle) * 0.058, 0.13, Math.sin(angle) * 0.058, lantern, 6));
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.004, 6, 16, Math.PI), M.iron);
    handle.position.y = 0.26;
    lantern.add(handle);
    const lanternLight = new THREE.PointLight(0xffa860, 1.6, 2.6, 2);
    lanternLight.position.set(0.72, 0.3, ROOM.maxZ - 0.45);
    room.add(lanternLight);
    lanternLights.push(lanternLight);

    const painting = new THREE.Group();
    painting.position.set(1.35, 1.74, ROOM.maxZ - 0.03);
    painting.rotation.y = Math.PI;
    room.add(painting);
    tag(painting, "painting");
    pickable(painting);
    const canvasPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.742), new THREE.MeshStandardMaterial({ map: tex.chartMap, roughness: 0.7 }));
    canvasPlane.position.z = 0.012;
    canvasPlane.receiveShadow = true;
    painting.add(canvasPlane);
    const frame = new THREE.Group();
    painting.add(frame);
    box(1.14, 0.07, 0.05, M.oldBrass, 0, 0.406, 0.02, frame);
    box(1.14, 0.07, 0.05, M.oldBrass, 0, -0.406, 0.02, frame);
    box(0.07, 0.882, 0.05, M.oldBrass, -0.535, 0, 0.02, frame);
    box(0.07, 0.882, 0.05, M.oldBrass, 0.535, 0, 0.02, frame);
    mergeStatic(frame);
    const pictureLight = new THREE.SpotLight(0xffe0b0, 1.3, 2.4, 0.75, 0.9, 2);
    pictureLight.position.set(1.35, 2.35, ROOM.maxZ - 0.5);
    pictureLight.target.position.set(1.35, 1.55, ROOM.maxZ);
    room.add(pictureLight);
    room.add(pictureLight.target);
    cyl(0.02, 0.02, 0.5, M.brass, 1.35, 2.2, ROOM.maxZ - 0.12, room, 12).rotation.z = Math.PI / 2;
  }

  // ---------- 창 + 달 + 망원경 ----------
  const eyepiece = new THREE.Group();
  {
    const windowGroup = new THREE.Group();
    windowGroup.position.set(ROOM.maxX - 0.02, WINDOW.y, WINDOW.z);
    windowGroup.rotation.y = -Math.PI / 2;
    room.add(windowGroup);
    tag(windowGroup, "window");
    pickable(windowGroup);
    const ring = shadowed(new THREE.Mesh(new THREE.TorusGeometry(WINDOW.r + 0.02, 0.05, 16, 64), M.darkWood));
    windowGroup.add(ring);
    const mullionMat = M.darkWood;
    box(WINDOW.r * 2, 0.035, 0.035, mullionMat, 0, 0, -0.03, windowGroup);
    box(0.035, WINDOW.r * 2, 0.035, mullionMat, 0, 0, -0.03, windowGroup);
    const innerRing = shadowed(new THREE.Mesh(new THREE.TorusGeometry(WINDOW.r * 0.5, 0.018, 8, 48), mullionMat));
    innerRing.position.z = -0.03;
    windowGroup.add(innerRing);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(WINDOW.r, 48), M.glass);
    glass.position.z = -0.05;
    windowGroup.add(glass);
    rbox(1.7, 0.05, 0.22, 0.01, M.darkWood, 0, -WINDOW.r - 0.08, 0.06, windowGroup);

    const sky = new THREE.Mesh(new THREE.PlaneGeometry(12, 9), new THREE.MeshBasicMaterial({ map: tex.skyMap, color: new THREE.Color(0.85, 0.9, 1.1) }));
    sky.position.set(7.5, 2.2, -0.4);
    sky.rotation.y = -Math.PI / 2;
    room.add(sky);
    const moon = new THREE.Mesh(new THREE.CircleGeometry(0.28, 48), new THREE.MeshBasicMaterial({ map: tex.moonMap, color: new THREE.Color(3.2, 3.1, 2.8), toneMapped: false }));
    moon.position.set(7.3, 3.05, -1.25);
    moon.rotation.y = -Math.PI / 2;
    room.add(moon);
    const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dotMap, color: 0x9fb8ff, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.55, depthWrite: false }));
    moonGlow.position.set(7.2, 3.05, -1.25);
    moonGlow.scale.setScalar(2.4);
    room.add(moonGlow);

    const telescope = new THREE.Group();
    telescope.position.set(2.2, 0, WINDOW.z - 0.05);
    room.add(telescope);
    tag(telescope, "telescope");
    pickable(telescope);
    const mount = new THREE.Vector3(0, 1.1, 0);
    const legs = new THREE.Group();
    telescope.add(legs);
    [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].forEach((angle) => {
      beam(mount.clone().add(new THREE.Vector3(0, -0.04, 0)), new THREE.Vector3(Math.cos(angle) * 0.42, 0, Math.sin(angle) * 0.42), 0.016, M.darkWood, legs);
    });
    cyl(0.05, 0.05, 0.05, M.brass, 0, 1.08, 0, legs, 20);
    mergeStatic(legs);
    const direction = new THREE.Vector3(1.0, 0.55, -0.1).normalize();
    const tube = new THREE.Group();
    tube.position.copy(mount).add(new THREE.Vector3(0, 0.07, 0));
    tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    telescope.add(tube);
    cyl(0.055, 0.065, 1.05, M.lacquer, 0, 0.18, 0, tube, 32);
    cyl(0.072, 0.072, 0.12, M.brass, 0, 0.66, 0, tube, 32);
    [-0.2, 0.2, 0.45].forEach((y) => cyl(0.068, 0.068, 0.025, M.brass, 0, y, 0, tube, 32));
    cyl(0.03, 0.045, 0.08, M.brass, 0, -0.38, 0, tube, 24);
    cyl(0.07, 0.07, 0.04, M.oldBrass, 0, 0, 0, tube, 16).rotation.z = Math.PI / 2;
    const objective = new THREE.Mesh(new THREE.CircleGeometry(0.06, 32), new THREE.MeshPhysicalMaterial({ color: 0x223355, roughness: 0.02, metalness: 0.3 }));
    objective.rotation.x = -Math.PI / 2;
    objective.position.y = 0.721;
    tube.add(objective);
    eyepiece.position.set(0, -0.45, 0);
    tube.add(eyepiece);
    cyl(0.022, 0.026, 0.09, M.brass, 0, 0, 0, eyepiece, 20);
    cyl(0.028, 0.028, 0.02, M.iron, 0, -0.04, 0, eyepiece, 20);
  }

  // ---------- 러그 + 숨은 열쇠 ----------
  const flapPivot = new THREE.Group();
  const keyGroup = new THREE.Group();
  {
    const rug = new THREE.Group();
    room.add(rug);
    tag(rug, "rug");
    pickable(rug);
    const RW = 2.6;
    const RD = 1.8;
    const cx = 0.1;
    const cz = 0.15;
    const s = 0.5;
    const toUv = (x: number, z: number) => [(x - (cx - RW / 2)) / RW, 1 - (z - (cz - RD / 2)) / RD];
    const x0 = cx - RW / 2;
    const x1 = cx + RW / 2;
    const z0 = cz - RD / 2;
    const z1 = cz + RD / 2;
    const bodyPoints: Array<[number, number]> = [
      [x0, z0],
      [x1, z0],
      [x1, z1 - s],
      [x1 - s, z1],
      [x0, z1],
    ];
    const bodyShape = new THREE.Shape(bodyPoints.map(([x, z]) => new THREE.Vector2(x, z)));
    const bodyGeometry = new THREE.ShapeGeometry(bodyShape);
    // ShapeGeometry의 (x, y)를 바닥 (x, z)로 옮기고 UV를 러그 전체 기준으로 재계산
    const positions = bodyGeometry.attributes.position as THREE.BufferAttribute;
    const uvs = bodyGeometry.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const z = positions.getY(i);
      positions.setXYZ(i, x, 0, z);
      const [u, v] = toUv(x, z);
      uvs.setXY(i, u, v);
    }
    const index = bodyGeometry.index;
    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        const a = index.getX(i + 1);
        index.setX(i + 1, index.getX(i + 2));
        index.setX(i + 2, a);
      }
    }
    bodyGeometry.computeVertexNormals();
    const rugMat = new THREE.MeshStandardMaterial({ map: tex.rugMap, roughness: 0.95 });
    const body = new THREE.Mesh(bodyGeometry, rugMat);
    body.position.y = 0.006;
    body.receiveShadow = true;
    rug.add(body);

    // 모서리 덮개: 힌지(대각선) 중점 기준으로 회전
    const A = new THREE.Vector3(x1, 0, z1 - s);
    const B = new THREE.Vector3(x1 - s, 0, z1);
    const C = new THREE.Vector3(x1, 0, z1);
    const mid = A.clone().add(B).multiplyScalar(0.5);
    flapPivot.position.set(mid.x, 0.008, mid.z);
    flapPivot.userData.axis = B.clone().sub(A).normalize();
    rug.add(flapPivot);
    const flapGeometry = new THREE.BufferGeometry();
    const local = [A, B, C].map((p) => p.clone().sub(mid));
    flapGeometry.setAttribute("position", new THREE.Float32BufferAttribute(local.flatMap((p) => [p.x, p.y, p.z]), 3));
    flapGeometry.setAttribute("uv", new THREE.Float32BufferAttribute([A, B, C].flatMap((p) => toUv(p.x, p.z)), 2));
    flapGeometry.setIndex([0, 1, 2]);
    flapGeometry.computeVertexNormals();
    if (flapGeometry.attributes.normal.getY(0) < 0) flapGeometry.setIndex([0, 2, 1]);
    flapGeometry.computeVertexNormals();
    const flapFront = new THREE.Mesh(flapGeometry, rugMat);
    flapFront.castShadow = true;
    flapPivot.add(flapFront);
    const flapBack = new THREE.Mesh(flapGeometry, new THREE.MeshStandardMaterial({ color: 0x5e4a36, roughness: 1, side: THREE.BackSide }));
    flapPivot.add(flapBack);
    const shadowPatch = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
    shadowPatch.rotation.x = -Math.PI / 2;
    shadowPatch.position.set(x1 - 0.14, 0.003, z1 - 0.14);
    rug.add(shadowPatch);

    keyGroup.position.set(x1 - 0.17, 0.012, z1 - 0.15);
    keyGroup.rotation.y = 0.7;
    room.add(keyGroup);
    tag(keyGroup, "brassKey");
    pickable(keyGroup);
    const bow = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 10, 24), M.brass));
    bow.rotation.x = Math.PI / 2;
    keyGroup.add(bow);
    box(0.08, 0.008, 0.008, M.brass, 0.06, 0, 0, keyGroup);
    box(0.012, 0.008, 0.022, M.brass, 0.09, 0, 0.012, keyGroup);
    box(0.01, 0.008, 0.016, M.brass, 0.072, 0, 0.01, keyGroup);
    const keySparkle = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dotMap, color: 0xffe3a0, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.6, depthWrite: false }));
    keySparkle.scale.setScalar(0.12);
    keySparkle.position.set(0.02, 0.02, 0);
    keyGroup.add(keySparkle);
  }

  // ---------- 천장 등 ----------
  const ceilingLight = new THREE.PointLight(0xffd6a0, 0, 10, 2);
  const ceilingBulbMat = new THREE.MeshStandardMaterial({ color: 0xfff1d8, emissive: 0xffd9a0, emissiveIntensity: 0, roughness: 0.3, transparent: true, opacity: 0.92 });
  {
    const pendant = new THREE.Group();
    pendant.position.set(0, ROOM.height, 0.1);
    room.add(pendant);
    cyl(0.005, 0.005, 0.5, M.iron, 0, -0.25, 0, pendant, 6);
    cyl(0.05, 0.08, 0.06, M.brass, 0, -0.52, 0, pendant, 24);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 20), ceilingBulbMat);
    globe.position.y = -0.64;
    pendant.add(globe);
    ceilingLight.position.set(0, ROOM.height - 0.66, 0.1);
    room.add(ceilingLight);
  }

  // ---------- 조명 ----------
  const hemi = new THREE.HemisphereLight(0x33477a, 0x1b120c, 0.55);
  scene.add(hemi);
  const moonLight = new THREE.DirectionalLight(0xa8bfff, 2.6);
  moonLight.position.set(7, 5, -1.4);
  moonLight.target.position.set(0, 0, 0.6);
  moonLight.castShadow = true;
  moonLight.shadow.camera.left = -6;
  moonLight.shadow.camera.right = 6;
  moonLight.shadow.camera.top = 6;
  moonLight.shadow.camera.bottom = -6;
  moonLight.shadow.camera.near = 1;
  moonLight.shadow.camera.far = 20;
  moonLight.shadow.bias = -0.0004;
  moonLight.shadow.normalBias = 0.02;
  scene.add(moonLight);
  scene.add(moonLight.target);
  lampLight.castShadow = true;
  lampLight.shadow.bias = -0.0006;
  lampLight.shadow.normalBias = 0.01;

  // 달빛 기둥 + 먼지
  const shaftDirection = new THREE.Vector3().subVectors(moonLight.target.position, moonLight.position).normalize();
  const shaftMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(ShaftShader.uniforms),
    vertexShader: ShaftShader.vertexShader,
    fragmentShader: ShaftShader.fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const shaftLength = 3.3;
  const shaftGeometry = new THREE.CylinderGeometry(WINDOW.r * 0.95, WINDOW.r * 1.1, shaftLength, 40, 1, true);
  shaftGeometry.translate(0, -shaftLength / 2, 0);
  const shaft = new THREE.Mesh(shaftGeometry, shaftMat);
  shaft.position.set(ROOM.maxX + 0.05, WINDOW.y, WINDOW.z);
  shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), shaftDirection);
  shaft.renderOrder = 2;
  scene.add(shaft);

  const dustCount = 260;
  const dustGeometry = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(dustCount * 3);
  const dustSeeds = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i += 1) {
    const t = Math.random() * shaftLength;
    const radius = Math.sqrt(Math.random()) * WINDOW.r;
    const angle = Math.random() * Math.PI * 2;
    const base = new THREE.Vector3(ROOM.maxX, WINDOW.y, WINDOW.z).addScaledVector(shaftDirection, t);
    dustPositions[i * 3] = base.x + Math.cos(angle) * radius * 0.4;
    dustPositions[i * 3 + 1] = base.y + Math.sin(angle) * radius;
    dustPositions[i * 3 + 2] = base.z + Math.cos(angle) * radius;
    dustSeeds[i] = Math.random() * 100;
  }
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const dustBase = dustPositions.slice();
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({ map: tex.dotMap, color: 0xc8d6ff, size: 0.018, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }),
  );
  scene.add(dust);

  // UV 손전등
  const uvLight = new THREE.SpotLight(0x8a4dff, 0, 7, 0.26, 0.55, 1.4);
  scene.add(uvLight);
  scene.add(uvLight.target);

  // ---------- 후처리 ----------
  let composer!: EffectComposer;
  let outlinePass!: OutlinePass;
  let bloomPass!: UnrealBloomPass;
  let vignettePass!: ShaderPass;
  const buildComposer = () => {
    const size = renderer.getSize(new THREE.Vector2());
    const pixelRatio = renderer.getPixelRatio();
    const target = new THREE.WebGLRenderTarget(Math.max(1, size.x * pixelRatio), Math.max(1, size.y * pixelRatio), {
      type: THREE.HalfFloatType,
      samples: quality === "high" ? 4 : 0,
    });
    composer = new EffectComposer(renderer, target);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(size.x, size.y);
    composer.addPass(new RenderPass(scene, camera));
    outlinePass = new OutlinePass(new THREE.Vector2(size.x, size.y), scene, camera);
    outlinePass.edgeStrength = 4;
    outlinePass.edgeGlow = 0.6;
    outlinePass.edgeThickness = 1.6;
    outlinePass.pulsePeriod = 2.4;
    outlinePass.visibleEdgeColor.set(0xffd98a);
    outlinePass.hiddenEdgeColor.set(0x3a2a10);
    composer.addPass(outlinePass);
    bloomPass = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), quality === "high" ? 0.62 : 0.5, 0.6, 0.92);
    composer.addPass(bloomPass);
    vignettePass = new ShaderPass(VignetteShader);
    composer.addPass(vignettePass);
    composer.addPass(new OutputPass());
  };

  const applyQuality = () => {
    const dpr = window.devicePixelRatio || 1;
    renderer.setPixelRatio(quality === "high" ? Math.min(dpr, 2) : Math.min(dpr, 1.25));
    const mapSize = quality === "high" ? 2048 : 1024;
    [moonLight, lampLight].forEach((light) => {
      light.shadow.mapSize.set(light === lampLight ? mapSize / 2 : mapSize, light === lampLight ? mapSize / 2 : mapSize);
      light.shadow.map?.dispose();
      light.shadow.map = null;
    });
    lampLight.castShadow = quality === "high";
    renderer.shadowMap.type = quality === "high" ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    renderer.shadowMap.needsUpdate = true;
    if (composer) {
      composer.renderTarget1.dispose();
      composer.renderTarget2.dispose();
      composer.dispose();
    }
    buildComposer();
    outlinePass.enabled = quality === "high";
    resize();
  };

  // ---------- 크기 ----------
  let width = 1;
  let height = 1;
  function resize() {
    const rect = container.getBoundingClientRect();
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = camera.aspect < 0.85 ? 70 : camera.aspect < 1.3 ? 62 : 55;
    camera.updateProjectionMatrix();
    composer?.setPixelRatio(renderer.getPixelRatio());
    composer?.setSize(width, height);
  }
  renderer.setSize(1, 1, false);
  applyQuality();
  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(container);

  // ---------- 상태 동기화 ----------
  let state: EscapeState | null = null;
  let view: ViewId = "overview";
  const anim = {
    flap: new Damped(0.32),
    drawer: new Damped(0),
    compartment: new Damped(0),
    lid: new Damped(0),
    door: new Damped(0),
    hall: new Damped(0),
    lamp: new Damped(1),
    power: new Damped(0),
    uv: new Damped(0),
    posterUV: new Damped(0),
    clockUV: new Damped(0),
    books: puzzleBooks.map(() => new Damped(0)),
    dials: dials.map(() => new Damped(0)),
  };
  let dialTurns = [0, 0, 0];
  let globeVelocity = 0;
  let powerFlicker = -1;
  let wrongBookTimer = 0;
  const flying: Array<{ object: THREE.Object3D; t: number; from: THREE.Vector3; scale: number }> = [];
  let keypadFlash: { kind: "wrong" | "near" | "ok"; until: number } | null = null;
  let lastLcdKey = "";
  let revealHold = 0;
  let revealSent = false;
  let clock = 0;

  const hide = (object: THREE.Object3D) => {
    if (!flying.some((item) => item.object === object)) object.visible = false;
  };
  const homes = new Map<THREE.Object3D, { position: THREE.Vector3; scale: number }>();
  const flyAway = (object: THREE.Object3D) => {
    if (!object.visible) return;
    if (!homes.has(object)) homes.set(object, { position: object.position.clone(), scale: object.scale.x });
    const from = new THREE.Vector3();
    object.getWorldPosition(from);
    flying.push({ object, t: 0, from, scale: object.scale.x });
  };
  const show = (object: THREE.Object3D, visible: boolean) => {
    const home = homes.get(object);
    if (visible && home && !flying.some((item) => item.object === object)) {
      object.position.copy(home.position);
      object.scale.setScalar(home.scale);
    }
    object.visible = visible;
  };

  // 선택된 칸이 위에서 내려다보는 시선(약 35°)을 향하도록 살짝 위로 기울입니다.
  const DIAL_TILT = 0.62;
  const dialAngle = (turns: number) => ((turns + 0.5) / 8) * Math.PI * 2 - Math.PI + DIAL_TILT;

  const drawLcd = () => {
    if (!state) return;
    const flash = keypadFlash && (keypadFlash.kind === "ok" || clock < keypadFlash.until) ? keypadFlash.kind : null;
    const key = `${state.flags.powerOn}|${state.flags.keypadEntry}|${flash}`;
    if (key === lastLcdKey) return;
    lastLcdKey = key;
    lcd.draw(state.flags.powerOn, state.flags.keypadEntry, flash);
    lcdMat.color.setScalar(state.flags.powerOn ? 1.6 : 1);
  };

  const sync = (next: EscapeState, nextView: ViewId, snap = false) => {
    const previous = state;
    state = next;
    view = nextView;
    const f = next.flags;
    // 처음 그리거나 저장 기록을 불러온 경우에는 애니메이션 없이 곧바로 맞춥니다.
    const first = previous === null || snap;
    if (snap) {
      flying.forEach((item) => item.object.scale.setScalar(item.scale));
      flying.length = 0;
      keypadFlash = null;
      wrongBookTimer = 0;
      powerFlicker = -1;
    }

    anim.flap.target = f.rugLifted ? 2.75 : 0.32;
    if (!f.rugLifted) keyGroup.visible = false;
    else if (f.keyTaken) {
      if (!first && !previous.flags.keyTaken) flyAway(keyGroup);
      else hide(keyGroup);
    } else show(keyGroup, true);

    anim.drawer.target = f.drawerOpen ? 0.3 : 0;
    if (f.drawerItemsTaken) {
      if (!first && !previous.flags.drawerItemsTaken) flyAway(drawerItems);
      else hide(drawerItems);
    } else show(drawerItems, true);

    anim.lamp.target = f.lampOn ? 1 : 0;
    if (!first && f.globeSpins > previous.flags.globeSpins) globeVelocity += 9;

    const pulls = f.bookPulls;
    puzzleBooks.forEach((_, index) => {
      anim.books[index].target = pulls.includes(index) || f.compartmentOpen ? 0.11 : 0;
    });
    if (!first && f.wrongBook && f.wrongBook.n !== previous.flags.wrongBook?.n) {
      const wrongIndex = f.wrongBook.index;
      puzzleBooks.forEach((_, index) => {
        anim.books[index].target = previous.flags.bookPulls.includes(index) || index === wrongIndex ? 0.11 : 0;
      });
      wrongBookTimer = 0.55;
    }

    anim.compartment.target = f.compartmentOpen ? 1.45 : 0;
    if (f.fuseTaken) {
      if (!first && !previous.flags.fuseTaken) flyAway(compartmentItems);
      else hide(compartmentItems);
    } else show(compartmentItems, f.compartmentOpen);

    f.chestDials.forEach((value, index) => {
      if (first) dialTurns[index] = value;
      else {
        const before = previous.flags.chestDials[index];
        dialTurns[index] += (value - before + 8) % 8;
      }
      anim.dials[index].target = dialAngle(dialTurns[index]);
      if (first || value !== previous.flags.chestDials[index] || f.chestOpen !== previous.flags.chestOpen) {
        dialWindows[index]?.draw(value, f.chestOpen);
      }
    });
    anim.lid.target = f.chestOpen ? 1.75 : 0;
    if (f.lensTaken) {
      if (!first && !previous.flags.lensTaken) flyAway(lensItem);
      else hide(lensItem);
    } else show(lensItem, f.chestOpen);

    eyepiece.visible = f.lensInstalled;

    anim.power.target = f.powerOn ? 1 : 0;
    installedFuse.visible = f.powerOn;
    if (!first && f.powerOn && !previous.flags.powerOn) powerFlicker = 0;
    fuseLedMat.color.set(f.powerOn ? new THREE.Color(0.2, 2.6, 0.6) : new THREE.Color(2.4, 0.2, 0.15));

    if (!first && f.keypad && f.keypad.n !== previous.flags.keypad?.n) {
      keypadFlash = { kind: f.keypad.kind, until: clock + 1.2 };
    } else if (first && f.doorOpen) {
      keypadFlash = { kind: "ok", until: Infinity };
    }
    drawLcd();

    anim.door.target = f.doorOpen ? -1.35 : 0;
    anim.hall.target = f.doorOpen ? 1 : 0;
    anim.uv.target = f.uvOn ? 1 : 0;
    if (!f.moonRevealed) revealSent = false;

    if (first) {
      [anim.flap, anim.drawer, anim.compartment, anim.lid, anim.door, anim.hall, anim.lamp, anim.power, anim.uv, ...anim.books, ...anim.dials].forEach((d) => d.snap());
    }

    if (hovered && !isAvailable(hovered)) setHover(null);
  };

  // ---------- 카메라 ----------
  const yaw = new Damped(0.18);
  const pitch = new Damped(-0.06);
  const camPos = OVERVIEW_POS.clone();
  const camTarget = new THREE.Vector3(0, 1.5, -2);
  const pointerNdc = new THREE.Vector2(0, 0);
  const tmpVec = new THREE.Vector3();

  const lookDirection = (y: number, p: number) => new THREE.Vector3(-Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p));

  const viewPose = (id: Exclude<ViewId, "overview">) => {
    const def = VIEWS[id];
    const target = new THREE.Vector3(...def.target);
    const dir = new THREE.Vector3(...def.dir).normalize();
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // 위쪽 HUD와 아래 소지품 막대를 피하도록 여유 공간을 두고, 대상을 화면 중앙보다 조금 위에 놓습니다.
    const safeH = def.h * 1.3;
    const distance = Math.max(safeH / 2 / tanHalf, def.w / 2 / (tanHalf * camera.aspect)) * 1.04;
    target.y -= def.h * 0.07;
    const position = target.clone().addScaledVector(dir, distance);
    position.x = THREE.MathUtils.clamp(position.x, ROOM.minX + 0.25, ROOM.maxX - 0.25);
    position.z = THREE.MathUtils.clamp(position.z, ROOM.minZ + 0.25, ROOM.maxZ - 0.25);
    position.y = THREE.MathUtils.clamp(position.y, 0.35, ROOM.height - 0.2);
    return { position, target };
  };

  // ---------- 포인터 ----------
  const raycaster = new THREE.Raycaster();
  let hovered: HotspotId | null = null;
  let pointerDown: { x: number; y: number; id: number; moved: boolean; lastX: number; lastY: number } | null = null;
  let pointerType = "mouse";

  const isAvailable = (id: HotspotId) => {
    const def = HOTSPOT_BY_ID.get(id);
    if (!def || !state) return false;
    return isHotspotAvailable(def, view, state);
  };

  const pick = (clientX: number, clientY: number): HotspotId | null => {
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(pickRoots, true);
    for (const hit of hits) {
      if (!isVisibleDeep(hit.object)) continue;
      let current: THREE.Object3D | null = hit.object;
      while (current) {
        const id = current.userData.hotspot as HotspotId | undefined;
        if (id && isAvailable(id)) return id;
        current = current.parent;
      }
    }
    return null;
  };

  const setHover = (id: HotspotId | null) => {
    if (hovered === id) return;
    hovered = id;
    const root = id ? findHotspotObject(id) : null;
    outlinePass.selectedObjects = root ? [root] : [];
    canvas.style.cursor = id ? "pointer" : view === "overview" ? "grab" : "default";
    if (id && state) {
      tooltip.textContent = hotspotLabel(id, state);
      tooltip.classList.add("is-visible");
    } else {
      tooltip.classList.remove("is-visible");
    }
  };

  const findHotspotObject = (id: HotspotId) => hotspotRoots.get(id) ?? null;

  const onPointerDown = (event: PointerEvent) => {
    pointerType = event.pointerType;
    pointerDown = { x: event.clientX, y: event.clientY, id: event.pointerId, moved: false, lastX: event.clientX, lastY: event.clientY };
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // 일부 브라우저에서 포인터 캡처가 실패해도 조작은 계속됩니다.
    }
    updatePointer(event);
  };
  const updatePointer = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointerNdc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    tooltip.style.transform = `translate(${event.clientX - rect.left + 16}px, ${event.clientY - rect.top + 14}px)`;
  };
  const onPointerMove = (event: PointerEvent) => {
    pointerType = event.pointerType;
    updatePointer(event);
    if (pointerDown && event.pointerId === pointerDown.id) {
      const dx = event.clientX - pointerDown.lastX;
      const dy = event.clientY - pointerDown.lastY;
      pointerDown.lastX = event.clientX;
      pointerDown.lastY = event.clientY;
      if (Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 7) pointerDown.moved = true;
      if (pointerDown.moved && view === "overview") {
        const speed = 3.2 / Math.max(320, width);
        yaw.target += dx * speed;
        pitch.target = THREE.MathUtils.clamp(pitch.target + dy * speed, -0.8, 0.55);
        canvas.style.cursor = "grabbing";
        setHover(null);
      }
      return;
    }
    if (event.pointerType === "mouse") setHover(pick(event.clientX, event.clientY));
  };
  const onPointerUp = (event: PointerEvent) => {
    if (!pointerDown || event.pointerId !== pointerDown.id) return;
    const wasDrag = pointerDown.moved;
    pointerDown = null;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // 무시
    }
    if (wasDrag) {
      canvas.style.cursor = view === "overview" ? "grab" : "default";
      return;
    }
    const id = pick(event.clientX, event.clientY);
    if (id) {
      if (event.pointerType !== "mouse") {
        const root = findHotspotObject(id);
        outlinePass.selectedObjects = root ? [root] : [];
        window.setTimeout(() => {
          if (!hovered) outlinePass.selectedObjects = [];
        }, 380);
      }
      callbacks.onHotspot(id);
    }
  };
  const onPointerLeave = () => {
    if (pointerType === "mouse") setHover(null);
  };
  const onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    callbacks.onBack();
  };
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("contextmenu", onContextMenu);

  const onContextLost = (event: Event) => {
    event.preventDefault();
    callbacks.onContextLost();
  };
  canvas.addEventListener("webglcontextlost", onContextLost);

  // ---------- 루프 ----------
  let paused = false;
  let disposed = false;
  let raf = 0;
  let last = performance.now();
  let perfTime = 0;
  let perfFrames = 0;
  let perfChecks = 0;
  const up = new THREE.Vector3(0, 1, 0);

  const update = (dt: number) => {
    clock += dt;
    const slow = reducedMotion ? 30 : 1;

    // 카메라
    yaw.step(dt, 7);
    pitch.step(dt, 7);
    let desiredPos: THREE.Vector3;
    let desiredTarget: THREE.Vector3;
    if (view === "overview") {
      const sway = reducedMotion ? 0 : Math.sin(clock * 0.5) * 0.004;
      desiredPos = OVERVIEW_POS.clone().add(new THREE.Vector3(0, sway, 0));
      desiredTarget = desiredPos.clone().add(lookDirection(yaw.value, pitch.value).multiplyScalar(2));
    } else {
      const pose = viewPose(view);
      desiredPos = pose.position;
      desiredTarget = pose.target;
      if (!reducedMotion && pointerType === "mouse") {
        const forward = tmpVec.subVectors(desiredTarget, desiredPos).normalize();
        const right = new THREE.Vector3().crossVectors(forward, up).normalize();
        desiredPos.addScaledVector(right, pointerNdc.x * 0.03).addScaledVector(up, pointerNdc.y * 0.02);
      }
    }
    const camRate = 1 - Math.exp(-(reducedMotion ? 30 : 4.2) * dt);
    camPos.lerp(desiredPos, camRate);
    camTarget.lerp(desiredTarget, camRate);
    camera.position.copy(camPos);
    camera.lookAt(camTarget);

    // 오브젝트 애니메이션
    const axis = flapPivot.userData.axis as THREE.Vector3;
    flapPivot.quaternion.setFromAxisAngle(axis, anim.flap.step(dt, 5 * slow));
    drawer.position.x = anim.drawer.step(dt, 6 * slow);
    compartmentDoor.rotation.x = -anim.compartment.step(dt, 4 * slow);
    lidPivot.rotation.x = anim.lid.step(dt, 2.4 * slow);
    doorPivot.rotation.y = anim.door.step(dt, 1.1 * slow);
    anim.hall.step(dt, 1.2);
    puzzleBooks.forEach((book, index) => {
      book.position.z = -0.19 + 0.125 + 0.02 - anim.books[index].step(dt, 9 * slow);
    });
    dials.forEach((dial, index) => {
      dial.rotation.x = anim.dials[index].step(dt, 10 * slow);
    });
    if (wrongBookTimer > 0) {
      wrongBookTimer -= dt;
      if (wrongBookTimer <= 0) anim.books.forEach((book) => (book.target = 0));
    }
    if (globeVelocity > 0.01) {
      globeSpin.rotation.y += globeVelocity * dt;
      globeVelocity *= Math.exp(-0.9 * dt);
    } else {
      globeSpin.rotation.y += dt * 0.05;
    }

    // 조명
    const lampLevel = anim.lamp.step(dt, 12);
    lampLight.intensity = 4 * lampLevel;
    lampShadeMat.emissiveIntensity = 0.05 + 0.9 * lampLevel;
    bulbMat.color.setRGB(0.3 + 3.2 * lampLevel, 0.25 + 2.5 * lampLevel, 0.2 + 1.6 * lampLevel);

    let power = anim.power.step(dt, 3);
    if (powerFlicker >= 0) {
      powerFlicker += dt;
      const on = powerFlicker > 1.3 || Math.sin(powerFlicker * 37) + Math.sin(powerFlicker * 13) > 0.4;
      power = on ? power : 0.08;
      if (powerFlicker > 1.5) powerFlicker = -1;
    }
    ceilingLight.intensity = 16 * power;
    ceilingBulbMat.emissiveIntensity = 3.2 * power;
    keypadGlow.intensity = 0.35 * power;
    hemi.intensity = 0.55 + 0.35 * power;
    keypadLedMat.color.setRGB(state?.flags.powerOn ? 0.1 : 0.15, state?.flags.powerOn ? 1.8 : 0.03, state?.flags.powerOn ? 0.5 : 0.03);

    const hall = anim.hall.value;
    hallLight.intensity = 26 * hall;
    hallMat.color.setRGB(0.02 + 5 * hall, 0.016 + 4.3 * hall, 0.012 + 3.2 * hall);

    const flicker = 1 + Math.sin(clock * 11.3) * 0.05 + Math.sin(clock * 23.7) * 0.04 + (Math.random() - 0.5) * 0.08;
    candleLight.intensity = 2.2 * flicker;
    lanternLights.forEach((light) => (light.intensity = 1.6 * (2 - flicker)));
    flames.forEach((flame, index) => {
      flame.scale.y = 2.4 * (0.9 + Math.sin(clock * (9 + index * 2.3)) * 0.08 + Math.random() * 0.05);
      flame.rotation.z = Math.sin(clock * 3 + index) * 0.06;
    });
    flameGlows.forEach((glow) => (glow.material.opacity = 0.45 * flicker));

    // UV
    const uvLevel = anim.uv.step(dt, 10);
    raycaster.setFromCamera(pointerNdc, camera);
    const beamDir = raycaster.ray.direction.clone();
    uvLight.position.copy(camera.position);
    uvLight.target.position.copy(camera.position).addScaledVector(beamDir, 3);
    uvLight.intensity = 26 * uvLevel;
    uvLight.visible = uvLevel > 0.01;
    const beamStrength = (mesh: THREE.Object3D) => {
      if (uvLevel < 0.05) return 0;
      const position = new THREE.Vector3();
      mesh.getWorldPosition(position);
      const toMesh = position.sub(camera.position);
      const distance = toMesh.length();
      const cos = toMesh.normalize().dot(beamDir);
      const cone = THREE.MathUtils.smoothstep(cos, Math.cos(0.3), Math.cos(0.1));
      return cone * uvLevel * (distance < 6 ? 1 : 0);
    };
    const posterBeam = beamStrength(posterUV);
    const moonRevealed = state?.flags.moonRevealed ?? false;
    anim.posterUV.target = Math.max(posterBeam, moonRevealed ? 0.28 : 0);
    posterUVMat.opacity = anim.posterUV.step(dt, 6);
    anim.clockUV.target = beamStrength(clockUV);
    clockUVMat.opacity = anim.clockUV.step(dt, 6);
    if (!moonRevealed && posterBeam > 0.7) {
      revealHold += dt;
      if (revealHold > 0.35 && !revealSent) {
        revealSent = true;
        callbacks.onUVReveal();
      }
    } else revealHold = 0;

    // 먼지
    const positions = dust.geometry.attributes.position as THREE.BufferAttribute;
    if (!reducedMotion) {
      for (let i = 0; i < dustCount; i += 1) {
        const seed = dustSeeds[i];
        positions.setXYZ(
          i,
          dustBase[i * 3] + Math.sin(clock * 0.13 + seed) * 0.08,
          dustBase[i * 3 + 1] + Math.sin(clock * 0.09 + seed * 1.7) * 0.12,
          dustBase[i * 3 + 2] + Math.cos(clock * 0.11 + seed) * 0.08,
        );
      }
      positions.needsUpdate = true;
    }
    (shaftMat.uniforms.time as { value: number }).value = clock;
    (vignettePass.uniforms.time as { value: number }).value = clock;

    // 주운 물건이 카메라로 날아옴
    for (let i = flying.length - 1; i >= 0; i -= 1) {
      const item = flying[i];
      item.t += dt / 0.65;
      const k = Math.min(1, item.t);
      const ease = k * k * (3 - 2 * k);
      const target = camera.position.clone().add(new THREE.Vector3(0, -0.25, 0).applyQuaternion(camera.quaternion)).addScaledVector(camera.getWorldDirection(tmpVec), 0.4);
      const world = item.from.clone().lerp(target, ease);
      world.y += Math.sin(k * Math.PI) * 0.15;
      item.object.parent?.worldToLocal(world);
      item.object.position.copy(world);
      item.object.scale.setScalar(item.scale * (1 - ease * 0.85));
      if (k >= 1) {
        item.object.visible = false;
        flying.splice(i, 1);
      }
    }

    if (keypadFlash && keypadFlash.kind !== "ok" && clock > keypadFlash.until) keypadFlash = null;
    drawLcd();
  };

  const frame = (now: number) => {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    if (paused || document.visibilityState === "hidden") {
      last = now;
      return;
    }
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    update(dt);
    composer.render(dt);

    perfTime += dt;
    perfFrames += 1;
    if (perfTime > 2.5) {
      const fps = perfFrames / perfTime;
      perfTime = 0;
      perfFrames = 0;
      perfChecks += 1;
      if (perfChecks > 1 && quality === "high" && fps < 32) {
        quality = "low";
        applyQuality();
        callbacks.onQuality("low");
      } else if (perfChecks > 1 && quality === "low" && fps < 22 && renderer.getPixelRatio() > 0.8) {
        renderer.setPixelRatio(0.75);
        composer.setPixelRatio(0.75);
        resize();
      }
    }
  };
  raf = requestAnimationFrame(frame);

  const disposeScene = () => {
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      materials.forEach((material) => {
        Object.values(material).forEach((value) => {
          if (value instanceof THREE.Texture) value.dispose();
        });
        material.dispose();
      });
    });
  };

  return {
    sync,
    setPaused(next) {
      paused = next;
      if (next) setHover(null);
    },
    setQuality(next) {
      if (next === quality) return;
      quality = next;
      perfChecks = -2;
      applyQuality();
    },
    setReducedMotion(next) {
      reducedMotion = next;
    },
    look(deltaYaw, deltaPitch = 0) {
      if (view !== "overview") return;
      yaw.target += deltaYaw;
      pitch.target = THREE.MathUtils.clamp(pitch.target + deltaPitch, -0.8, 0.55);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("contextmenu", onContextMenu);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      disposeScene();
      tex.dispose();
      lcd.texture.dispose();
      dialWindows.forEach((reading) => reading.texture.dispose());
      envTexture.dispose();
      pmrem.dispose();
      composer.dispose();
      renderer.dispose();
      canvas.remove();
      tooltip.remove();
    },
  };
}
