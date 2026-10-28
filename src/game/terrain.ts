import * as THREE from 'three';
import { fbm2d, perlin2d, clamp } from './math';

export const WATER_LEVEL = 1.8;
export const WORLD_SIZE = 340; // 340x340 meter terrain
export const TERRAIN_SEGMENTS = 140;

export interface Landmark {
  id: string;
  name: string;
  description: string;
  x: number;
  z: number;
  y: number;
  radius: number;
  activated: boolean;
  color: number;
  runeSymbol: string;
}

export const LANDMARKS: Landmark[] = [
  {
    id: 'watchtower',
    name: 'Aethel Watchtower',
    description: 'An ancient spire overlooking the golden western horizon.',
    x: 65,
    z: -70,
    y: 0,
    radius: 4.5,
    activated: false,
    color: 0xffaa33,
    runeSymbol: 'ᚠ'
  },
  {
    id: 'sunken_shrine',
    name: 'Sunken Shrine',
    description: 'A tranquil stone sanctuary bathed in sunset water reflections.',
    x: -55,
    z: 35,
    y: 0,
    radius: 5.0,
    activated: false,
    color: 0x33ddff,
    runeSymbol: 'ᚱ'
  },
  {
    id: 'whispering_grove',
    name: 'Whispering Grove',
    description: 'A dense sanctuary of ancient golden-leafed oak trees.',
    x: -75,
    z: -55,
    y: 0,
    radius: 4.5,
    activated: false,
    color: 0x55ff66,
    runeSymbol: 'ᚦ'
  },
  {
    id: 'sunstone_arch',
    name: 'Sunstone Arch',
    description: 'A monumental natural rock portal capturing the god rays.',
    x: 55,
    z: 60,
    y: 0,
    radius: 5.0,
    activated: false,
    color: 0xff5533,
    runeSymbol: 'ᛋ'
  },
  {
    id: 'solstice_cairn',
    name: 'Solstice Cairn',
    description: 'The crowning peak altar commemorating the eternal sunset.',
    x: 0,
    z: 95,
    y: 0,
    radius: 5.0,
    activated: false,
    color: 0xffdd44,
    runeSymbol: 'ᛟ'
  }
];

/**
 * Procedural height function for any (x, z) coordinate in the world.
 * Returns continuous smooth elevation.
 */
export function getTerrainHeight(x: number, z: number): number {
  // Distance from world center
  const distFromCenter = Math.sqrt(x * x + z * z);
  
  // Boundary gentle mountain ridges to keep player inside naturally
  const edgeFactor = Math.max(0, (distFromCenter - 115) / 45);
  const boundaryCliffs = Math.pow(edgeFactor, 1.8) * 20;

  // Broad rolling hills
  const broad = fbm2d(x * 0.007 + 10.5, z * 0.007 + 10.5, 3, 0.5, 2.0) * 16;

  // Medium undulations
  const medium = fbm2d(x * 0.02 + 5.2, z * 0.02 + 5.2, 4, 0.45, 2.2) * 7;

  // Detail roughness
  const fine = perlin2d(x * 0.08, z * 0.08) * 0.8;

  // Lake depression around (-55, 35)
  const lakeDx = x - (-55);
  const lakeDz = z - 35;
  const lakeDist = Math.sqrt(lakeDx * lakeDx + lakeDz * lakeDz);
  let lakeDepression = 0;
  if (lakeDist < 45) {
    const t = Math.cos((lakeDist / 45) * Math.PI * 0.5);
    lakeDepression = t * t * 7.5;
  }

  // Watchtower Peak plateau elevation around (65, -70)
  const peakDx = x - 65;
  const peakDz = z - (-70);
  const peakDist = Math.sqrt(peakDx * peakDx + peakDz * peakDz);
  let peakElevation = 0;
  if (peakDist < 40) {
    const t = Math.cos((peakDist / 40) * Math.PI * 0.5);
    peakElevation = t * t * 14;
  }

  // Solstice Cairn Hill around (0, 95)
  const cairnDx = x - 0;
  const cairnDz = z - 95;
  const cairnDist = Math.sqrt(cairnDx * cairnDx + cairnDz * cairnDz);
  let cairnElevation = 0;
  if (cairnDist < 35) {
    const t = Math.cos((cairnDist / 35) * Math.PI * 0.5);
    cairnElevation = t * t * 12;
  }

  // Smooth spawn clearing near (0, 0)
  const spawnDist = Math.sqrt(x * x + z * z);
  const spawnFlatten = clamp((spawnDist - 12) / 25, 0, 1);

  const baseHeight = 3.5 + broad + medium + fine - lakeDepression + peakElevation + cairnElevation + boundaryCliffs;

  return 3.0 * (1 - spawnFlatten) + baseHeight * spawnFlatten;
}

/**
 * Returns surface normal vector at (x, z)
 */
export function getTerrainNormal(x: number, z: number, eps = 0.5): THREE.Vector3 {
  const hL = getTerrainHeight(x - eps, z);
  const hR = getTerrainHeight(x + eps, z);
  const hD = getTerrainHeight(x, z - eps);
  const hU = getTerrainHeight(x, z + eps);

  const normal = new THREE.Vector3((hL - hR) / (2 * eps), 1.0, (hD - hU) / (2 * eps));
  return normal.normalize();
}

/**
 * Calculate slope angle in radians (0 = flat, PI/2 = vertical)
 */
export function getTerrainSlope(x: number, z: number): number {
  const normal = getTerrainNormal(x, z);
  return Math.acos(clamp(normal.y, 0, 1));
}

/**
 * Procedural grass/rock ground texture with warm sunset tints
 */
export function createTerrainTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base lush grass with warm golden-amber underglow
  ctx.fillStyle = '#4a6728';
  ctx.fillRect(0, 0, 1024, 1024);

  // Mottled organic patches
  for (let i = 0; i < 400; i++) {
    const px = Math.random() * 1024;
    const py = Math.random() * 1024;
    const r = 20 + Math.random() * 60;
    const shade = Math.random();
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    if (shade > 0.65) {
      ctx.fillStyle = 'rgba(102, 138, 48, 0.25)'; // bright sunlit moss
    } else if (shade > 0.3) {
      ctx.fillStyle = 'rgba(56, 82, 30, 0.3)'; // rich pine green
    } else {
      ctx.fillStyle = 'rgba(142, 118, 62, 0.18)'; // dry warm soil
    }
    ctx.fill();
  }

  // Fine blade noise
  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const grain = (Math.random() - 0.5) * 16;
    d[i] = clamp(d[i] + grain, 0, 255);
    d[i + 1] = clamp(d[i + 1] + grain * 1.2, 0, 255);
    d[i + 2] = clamp(d[i + 2] + grain * 0.8, 0, 255);
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(24, 24);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Procedural normal map for terrain micro-relief
 */
export function createTerrainNormalMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(512, 512);
  const d = imgData.data;

  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4;
      const nx = (Math.random() - 0.5) * 40;
      const ny = (Math.random() - 0.5) * 40;
      d[idx] = clamp(128 + nx, 0, 255);
      d[idx + 1] = clamp(128 + ny, 0, 255);
      d[idx + 2] = 255;
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(40, 40);
  return texture;
}
