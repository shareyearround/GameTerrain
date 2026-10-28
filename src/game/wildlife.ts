import * as THREE from 'three';
import { createStagModel, createHawkModel, StagMeshGroup, HawkMeshGroup } from './models';
import { getTerrainHeight, WATER_LEVEL } from './terrain';
import { clamp, distSq2d } from './math';

export type StagState = 'GRAZING' | 'ALERT' | 'FLEE' | 'WANDER';

export interface StagEntity {
  mesh: StagMeshGroup;
  x: number;
  z: number;
  y: number;
  targetX: number;
  targetZ: number;
  yaw: number;
  speed: number;
  state: StagState;
  stateTimer: number;
  animTime: number;
}

export interface HawkEntity {
  mesh: HawkMeshGroup;
  centerX: number;
  centerZ: number;
  altitude: number;
  radius: number;
  angle: number;
  speed: number;
  flapTime: number;
}

export class WildlifeManager {
  stags: StagEntity[] = [];
  hawks: HawkEntity[] = [];
  firefliesMesh: THREE.Points | null = null;
  fireflyPositions: Float32Array | null = null;
  fireflyBaseY: Float32Array | null = null;

  init(scene: THREE.Scene) {
    // 1. Spawn Stags in meadows
    const stagSpawns = [
      { x: -20, z: -25 },
      { x: -35, z: -15 },
      { x: 25, z: 20 },
      { x: 38, z: 32 },
      { x: -70, z: -35 },
      { x: -85, z: -70 },
      { x: 15, z: -45 }
    ];

    stagSpawns.forEach((spawn) => {
      const mesh = createStagModel();
      const y = getTerrainHeight(spawn.x, spawn.z);
      mesh.position.set(spawn.x, y, spawn.z);
      scene.add(mesh);

      this.stags.push({
        mesh,
        x: spawn.x,
        z: spawn.z,
        y,
        targetX: spawn.x + (Math.random() - 0.5) * 15,
        targetZ: spawn.z + (Math.random() - 0.5) * 15,
        yaw: Math.random() * Math.PI * 2,
        speed: 0,
        state: 'GRAZING',
        stateTimer: 2 + Math.random() * 4,
        animTime: Math.random() * 10
      });
    });

    // 2. Spawn Hawks soaring thermals
    const hawkSpawns = [
      { cx: 0, cz: 0, alt: 36, rad: 45, spd: 0.25 },
      { cx: 65, cz: -70, alt: 48, rad: 35, spd: 0.3 },
      { cx: -55, cz: 35, alt: 40, rad: 50, spd: 0.22 }
    ];

    hawkSpawns.forEach((h) => {
      const mesh = createHawkModel();
      scene.add(mesh);
      this.hawks.push({
        mesh,
        centerX: h.cx,
        centerZ: h.cz,
        altitude: h.alt,
        radius: h.rad,
        angle: Math.random() * Math.PI * 2,
        speed: h.spd,
        flapTime: Math.random() * 10
      });
    });

    // 3. Fireflies Particle System (150 instances)
    const count = 150;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const baseY = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const fx = (Math.random() - 0.5) * 220;
      const fz = (Math.random() - 0.5) * 220;
      const gy = getTerrainHeight(fx, fz);
      const fy = Math.max(gy, WATER_LEVEL) + 0.6 + Math.random() * 2.5;

      pos[i * 3] = fx;
      pos[i * 3 + 1] = fy;
      pos[i * 3 + 2] = fz;

      baseY[i] = fy;

      // Golden amber and chartreuse firefly tints
      const isAmber = Math.random() > 0.4;
      colors[i * 3] = isAmber ? 1.0 : 0.7;
      colors[i * 3 + 1] = isAmber ? 0.8 : 1.0;
      colors[i * 3 + 2] = isAmber ? 0.2 : 0.2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle sprite using canvas
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 64;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext('2d')!;
    const grad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 220, 100, 0.8)');
    grad.addColorStop(1, 'rgba(255, 180, 0, 0)');
    pCtx.fillStyle = grad;
    pCtx.fillRect(0, 0, 64, 64);
    const pTexture = new THREE.CanvasTexture(pCanvas);

    const mat = new THREE.PointsMaterial({
      size: 0.85,
      map: pTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.firefliesMesh = new THREE.Points(geo, mat);
    this.fireflyPositions = pos;
    this.fireflyBaseY = baseY;
    scene.add(this.firefliesMesh);
  }

  update(dt: number, playerX: number, playerZ: number, isTwilightOrSunset: boolean) {
    // 1. Update Stags
    this.stags.forEach((stag) => {
      stag.animTime += dt;
      stag.stateTimer -= dt;

      const d2Player = distSq2d(stag.x, stag.z, playerX, playerZ);

      // State transitions based on player proximity
      if (d2Player < 14 * 14) {
        // Player is very close -> FLEE
        stag.state = 'FLEE';
        const fleeDirX = stag.x - playerX;
        const fleeDirZ = stag.z - playerZ;
        const fleeLen = Math.sqrt(fleeDirX * fleeDirX + fleeDirZ * fleeDirZ) || 1;
        stag.targetX = stag.x + (fleeDirX / fleeLen) * 35;
        stag.targetZ = stag.z + (fleeDirZ / fleeLen) * 35;
        stag.stateTimer = 4.0;
      } else if (d2Player < 28 * 28 && stag.state === 'GRAZING') {
        // Player is nearby -> ALERT
        stag.state = 'ALERT';
        stag.targetX = playerX;
        stag.targetZ = playerZ;
        stag.stateTimer = 3.0;
      } else if (stag.stateTimer <= 0) {
        // Random transition between WANDER and GRAZING
        if (stag.state === 'FLEE' || stag.state === 'ALERT') {
          stag.state = 'GRAZING';
          stag.stateTimer = 4 + Math.random() * 5;
        } else if (stag.state === 'GRAZING') {
          stag.state = 'WANDER';
          stag.targetX = stag.x + (Math.random() - 0.5) * 20;
          stag.targetZ = stag.z + (Math.random() - 0.5) * 20;
          stag.stateTimer = 3 + Math.random() * 4;
        } else {
          stag.state = 'GRAZING';
          stag.stateTimer = 4 + Math.random() * 6;
        }
      }

      // Movement logic
      let maxSpeed = 0;
      if (stag.state === 'FLEE') {
        maxSpeed = 11.0;
      } else if (stag.state === 'WANDER') {
        maxSpeed = 2.4;
      }

      if (maxSpeed > 0) {
        const toTargetX = stag.targetX - stag.x;
        const toTargetZ = stag.targetZ - stag.z;
        const dist = Math.sqrt(toTargetX * toTargetX + toTargetZ * toTargetZ);

        if (dist > 1.0) {
          const desiredYaw = Math.atan2(toTargetX, toTargetZ);
          // Smooth rotation
          let diff = desiredYaw - stag.yaw;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          stag.yaw += diff * Math.min(1, 6 * dt);

          stag.speed += (maxSpeed - stag.speed) * Math.min(1, 4 * dt);
          stag.x += Math.sin(stag.yaw) * stag.speed * dt;
          stag.z += Math.cos(stag.yaw) * stag.speed * dt;

          // Prevent wandering into deep water or out of bounds
          stag.x = clamp(stag.x, -140, 140);
          stag.z = clamp(stag.z, -140, 140);
        } else {
          stag.speed = 0;
          if (stag.state === 'WANDER') stag.state = 'GRAZING';
        }
      } else {
        stag.speed = 0;
      }

      // Update position on ground
      stag.y = Math.max(getTerrainHeight(stag.x, stag.z), WATER_LEVEL);
      stag.mesh.position.set(stag.x, stag.y, stag.z);
      stag.mesh.rotation.y = stag.yaw;

      // Articulated leg & neck animation
      const parts = stag.mesh.userData;
      if (stag.speed > 0.5) {
        // Gallop / trot gait
        const legFreq = stag.state === 'FLEE' ? 14 : 7;
        const sinG = Math.sin(stag.animTime * legFreq);
        parts.legFL.rotation.x = sinG * 0.6;
        parts.legBR.rotation.x = sinG * 0.6;
        parts.legFR.rotation.x = -sinG * 0.6;
        parts.legBL.rotation.x = -sinG * 0.6;
        parts.neck.rotation.x = Math.sin(stag.animTime * legFreq * 0.5) * 0.15;
      } else {
        // Resting / grazing / alert
        parts.legFL.rotation.x = 0;
        parts.legFR.rotation.x = 0;
        parts.legBL.rotation.x = 0;
        parts.legBR.rotation.x = 0;

        if (stag.state === 'GRAZING') {
          // Head lowered to grass
          parts.neck.rotation.x = -0.45 + Math.sin(stag.animTime * 1.5) * 0.12;
        } else if (stag.state === 'ALERT') {
          // Head perked high
          parts.neck.rotation.x = 0.2;
        } else {
          parts.neck.rotation.x = 0;
        }
      }
    });

    // 2. Update Hawks
    this.hawks.forEach((hawk) => {
      hawk.angle += hawk.speed * dt;
      hawk.flapTime += dt;

      const hx = hawk.centerX + Math.cos(hawk.angle) * hawk.radius;
      const hz = hawk.centerZ + Math.sin(hawk.angle) * hawk.radius;
      const hy = hawk.altitude + Math.sin(hawk.angle * 2) * 3;

      hawk.mesh.position.set(hx, hy, hz);

      // Facing tangent + bank angle
      const tangentYaw = hawk.angle + Math.PI / 2;
      hawk.mesh.rotation.set(0, -tangentYaw, 0.28); // Inward bank

      // Wing flapping (gliding with occasional flap bursts)
      const flapCycle = Math.sin(hawk.flapTime * 3);
      const isFlapping = Math.sin(hawk.flapTime * 0.4) > 0.3;
      const wingAngle = isFlapping ? flapCycle * 0.45 : 0.05;
      hawk.mesh.userData.leftWing.rotation.z = -wingAngle;
      hawk.mesh.userData.rightWing.rotation.z = wingAngle;
    });

    // 3. Update Fireflies
    if (this.firefliesMesh && this.fireflyPositions && this.fireflyBaseY) {
      const pos = this.fireflyPositions;
      const count = pos.length / 3;
      const time = performance.now() * 0.001;

      for (let i = 0; i < count; i++) {
        // Gentle bobbing and drifting
        pos[i * 3 + 1] = this.fireflyBaseY[i] + Math.sin(time * 2 + i) * 0.4;
        pos[i * 3] += Math.sin(time + i * 0.7) * 0.02;
        pos[i * 3 + 2] += Math.cos(time + i * 0.5) * 0.02;
      }
      this.firefliesMesh.geometry.attributes.position.needsUpdate = true;
      (this.firefliesMesh.material as THREE.PointsMaterial).opacity = isTwilightOrSunset ? 0.95 : 0.2;
    }
  }
}
