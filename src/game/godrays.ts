import * as THREE from 'three';

/**
 * Procedural Volumetric God Rays & Atmospheric Sunset Flare.
 * Software-WebGL safe: Uses geometry-based additive blending and radial ray fans.
 */

export class GodRaysAtmosphere {
  group = new THREE.Group();
  sunDisc: THREE.Mesh;
  rayFan: THREE.Mesh;
  pollenPoints: THREE.Points;
  pollenPositions: Float32Array;

  constructor() {
    // 1. Radiant Sun Core
    const sunCanvas = document.createElement('canvas');
    sunCanvas.width = 256;
    sunCanvas.height = 256;
    const ctx = sunCanvas.getContext('2d')!;

    ctx.clearRect(0, 0, 256, 256);
    const grad = ctx.createRadialGradient(128, 128, 6, 128, 128, 120);
    grad.addColorStop(0, 'rgba(255, 255, 240, 1.0)');
    grad.addColorStop(0.2, 'rgba(255, 215, 120, 0.95)');
    grad.addColorStop(0.5, 'rgba(255, 140, 40, 0.4)');
    grad.addColorStop(0.8, 'rgba(240, 80, 20, 0.1)');
    grad.addColorStop(1.0, 'rgba(200, 60, 20, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const sunTex = new THREE.CanvasTexture(sunCanvas);
    const sunMat = new THREE.MeshBasicMaterial({
      map: sunTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.sunDisc = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), sunMat);
    this.group.add(this.sunDisc);

    // 2. Volumetric Ray Fan (Radial God Ray Shafts)
    const rayCanvas = document.createElement('canvas');
    rayCanvas.width = 512;
    rayCanvas.height = 512;
    const rCtx = rayCanvas.getContext('2d')!;
    rCtx.clearRect(0, 0, 512, 512);

    // Draw multi-shaft golden light burst
    const numShafts = 20;
    for (let i = 0; i < numShafts; i++) {
      const angle = (i / numShafts) * Math.PI * 2 + (Math.sin(i * 3) * 0.1);
      const width = 0.08 + (Math.sin(i * 5) * 0.5 + 0.5) * 0.09;
      const alpha = 0.12 + (Math.cos(i * 7) * 0.5 + 0.5) * 0.35;

      const rGrad = rCtx.createRadialGradient(256, 256, 15, 256, 256, 256);
      rGrad.addColorStop(0, `rgba(255, 225, 150, ${alpha * 0.7})`);
      rGrad.addColorStop(0.4, `rgba(255, 160, 60, ${alpha * 0.4})`);
      rGrad.addColorStop(1, 'rgba(230, 100, 30, 0.0)');

      rCtx.fillStyle = rGrad;
      rCtx.beginPath();
      rCtx.moveTo(256, 256);
      rCtx.arc(256, 256, 256, angle - width, angle + width);
      rCtx.closePath();
      rCtx.fill();
    }

    const rayTex = new THREE.CanvasTexture(rayCanvas);
    const rayMat = new THREE.MeshBasicMaterial({
      map: rayTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.75,
      side: THREE.DoubleSide
    });
    this.rayFan = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), rayMat);
    this.group.add(this.rayFan);

    // 3. Floating Sunlit Atmospheric Pollen & Dust Motes
    const pollenCount = 300;
    const pGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(pollenCount * 3);
    for (let i = 0; i < pollenCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = Math.random() * 25 + 1;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = 32;
    dotCanvas.height = 32;
    const dCtx = dotCanvas.getContext('2d')!;
    const dGrad = dCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    dGrad.addColorStop(0, 'rgba(255, 240, 200, 0.9)');
    dGrad.addColorStop(1, 'rgba(255, 180, 80, 0)');
    dCtx.fillStyle = dGrad;
    dCtx.fillRect(0, 0, 32, 32);

    const pollenMat = new THREE.PointsMaterial({
      size: 0.65,
      map: new THREE.CanvasTexture(dotCanvas),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.6
    });

    this.pollenPoints = new THREE.Points(pGeo, pollenMat);
    this.pollenPositions = pos;
  }

  update(
    camera: THREE.Camera,
    sunPosition: THREE.Vector3,
    godRayIntensity: number,
    playerPos: THREE.Vector3
  ) {
    // Align sun disc and ray fan towards camera
    this.group.position.copy(sunPosition);
    this.sunDisc.lookAt(camera.position);
    this.rayFan.lookAt(camera.position);

    // Slowly rotate ray fan for living shimmering god rays
    this.rayFan.rotation.z += 0.001;

    // Adjust opacity based on weather godRayIntensity
    (this.rayFan.material as THREE.MeshBasicMaterial).opacity = Math.max(0.05, godRayIntensity * 0.85);
    (this.sunDisc.material as THREE.MeshBasicMaterial).opacity = Math.max(0.2, godRayIntensity * 0.95);

    // Update pollen motes relative to player
    if (this.pollenPoints && this.pollenPositions) {
      const time = performance.now() * 0.0005;
      const pos = this.pollenPositions;
      const count = pos.length / 3;

      for (let i = 0; i < count; i++) {
        // Drift in wind
        pos[i * 3] += Math.sin(time + i) * 0.02;
        pos[i * 3 + 1] += Math.cos(time * 0.7 + i) * 0.01;
        pos[i * 3 + 2] += Math.sin(time * 0.5 + i * 0.5) * 0.02;

        // Wrap around player if too far
        const dx = pos[i * 3] - playerPos.x;
        const dz = pos[i * 3 + 2] - playerPos.z;
        if (dx > 30) pos[i * 3] -= 60;
        if (dx < -30) pos[i * 3] += 60;
        if (dz > 30) pos[i * 3 + 2] -= 60;
        if (dz < -30) pos[i * 3 + 2] += 60;
      }
      this.pollenPoints.geometry.attributes.position.needsUpdate = true;
      (this.pollenPoints.material as THREE.PointsMaterial).opacity = godRayIntensity * 0.7;
    }
  }
}
