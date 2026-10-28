import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  createInitialPhysicsState,
  updatePlayerPhysics,
  PlayerPhysicsState,
  PlayerInput
} from './physics';
import {
  WORLD_SIZE,
  TERRAIN_SEGMENTS,
  WATER_LEVEL,
  LANDMARKS,
  Landmark,
  getTerrainHeight,
  createTerrainTexture,
  createTerrainNormalMap
} from './terrain';
import {
  createPlayerModel,
  createPineTreeModel,
  createOakTreeModel,
  createLandmarkModel,
  PlayerMeshGroup
} from './models';
import { WildlifeManager } from './wildlife';
import { WeatherSystem, WeatherType } from './weather';
import { GodRaysAtmosphere } from './godrays';
import { sound } from './audio';
import { clamp, damp } from './math';

export interface EngineCallbacks {
  onRuneActivated: (landmark: Landmark, totalActivated: number) => void;
  onStateUpdate: (data: {
    stamina: number;
    speed: number;
    weather: WeatherType;
    activeRunes: number;
    totalRunes: number;
    nearestLandmark: { name: string; distance: number; symbol: string } | null;
    playerPos: { x: number; y: number; z: number };
    playerYaw: number;
  }) => void;
  onVictory: () => void;
}

export class GameEngine {
  container: HTMLElement;
  callbacks: EngineCallbacks;

  // Three.js Core
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  isSoftwareGl = false;

  // Environment & Lights
  dirLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  skyDome: THREE.Mesh;
  waterMesh: THREE.Mesh;
  terrainMesh: THREE.Mesh;

  // Entities & Systems
  playerPhysics: PlayerPhysicsState;
  playerMesh: PlayerMeshGroup;
  wildlife: WildlifeManager;
  weather: WeatherSystem;
  godRays: GodRaysAtmosphere;
  landmarks: Landmark[];
  landmarkGroups: THREE.Group[] = [];

  // Input State
  input: PlayerInput = {
    moveX: 0,
    moveZ: 0,
    jumpJustPressed: false,
    sprintHeld: false,
    interactJustPressed: false
  };

  // Camera Rig
  cameraYaw = 0;
  cameraPitch = 0.25;
  cameraDistance = 7.5;
  cameraMode: 'third' | 'first' | 'cinematic' = 'third';
  titleCameraTime = 0;

  // Loop & Lifecycle
  gameState: 'title' | 'playing' | 'paused' | 'gameover' = 'title';
  private frameId = 0;
  private lastTime = 0;
  private isDestroyed = false;

  // Math Scratchpad (Zero-GC)
  private readonly _vec3A = new THREE.Vector3();
  private readonly _vec3B = new THREE.Vector3();
  private readonly _vec3C = new THREE.Vector3();

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.landmarks = JSON.parse(JSON.stringify(LANDMARKS));

    // 1. Detect Software WebGL
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    // 2. Initialize Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance'
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 3. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf58b44);
    this.camera = new THREE.PerspectiveCamera(
      60,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.2,
      800
    );

    // 4. Procedural Studio Environment Reflection
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch {
      // Ignored if PMREM unsupported
    }

    // 5. Lighting Rig (Warm/Cool Temperature Balance)
    this.hemiLight = new THREE.HemisphereLight(0xffb380, 0x3d3024, 0.9);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xff8833, 3.2);
    this.dirLight.position.set(-140, 32, -120);
    this.dirLight.castShadow = !this.isSoftwareGl;
    if (this.dirLight.castShadow) {
      this.dirLight.shadow.mapSize.width = 1024;
      this.dirLight.shadow.mapSize.height = 1024;
      this.dirLight.shadow.camera.near = 10;
      this.dirLight.shadow.camera.far = 380;
      const d = 80;
      this.dirLight.shadow.camera.left = -d;
      this.dirLight.shadow.camera.right = d;
      this.dirLight.shadow.camera.top = d;
      this.dirLight.shadow.camera.bottom = -d;
      this.dirLight.shadow.bias = -0.0005;
      this.dirLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.dirLight);

    // Fog
    this.scene.fog = new THREE.Fog(0xc87137, 35, 260);

    // 6. Sky Dome
    const skyGeo = new THREE.SphereGeometry(600, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x3b3a6d) },
        bottomColor: { value: new THREE.Color(0xf58b44) }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vNormal;
        void main() {
          // Normal.y = 0 at horizon, 1 at zenith
          float h = clamp(vNormal.y, 0.0, 1.0);
          gl_FragColor = vec4(mix(bottomColor, topColor, pow(h, 0.65)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);

    // 7. Terrain
    const terrainGeo = new THREE.PlaneGeometry(
      WORLD_SIZE,
      WORLD_SIZE,
      TERRAIN_SEGMENTS,
      TERRAIN_SEGMENTS
    );
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      posAttr.setY(i, getTerrainHeight(vx, vz));
    }
    terrainGeo.computeVertexNormals();

    const terrainTexture = createTerrainTexture();
    const terrainNormal = createTerrainNormalMap();
    const terrainMat = new THREE.MeshStandardMaterial({
      map: terrainTexture,
      normalMap: terrainNormal,
      roughness: 0.85,
      metalness: 0.05
    });

    this.terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    this.terrainMesh.receiveShadow = !this.isSoftwareGl;
    this.scene.add(this.terrainMesh);

    // 8. Water Plane with Subtle Wave Shading
    const waterGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 64, 64);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1a4855,
      roughness: 0.12,
      metalness: 0.45,
      transparent: true,
      opacity: 0.82
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.y = WATER_LEVEL;
    this.waterMesh.receiveShadow = !this.isSoftwareGl;
    this.scene.add(this.waterMesh);

    // 9. Systems: Weather & God Rays
    this.weather = new WeatherSystem();
    this.godRays = new GodRaysAtmosphere();
    this.scene.add(this.godRays.group);
    this.scene.add(this.godRays.pollenPoints);

    // 10. Player Physics & Model
    this.playerPhysics = createInitialPhysicsState(0, 0);
    this.playerMesh = createPlayerModel();
    this.scene.add(this.playerMesh);

    // 11. Landmarks
    this.landmarks.forEach((landmark) => {
      landmark.y = getTerrainHeight(landmark.x, landmark.z);
      const model = createLandmarkModel(landmark);
      model.position.set(landmark.x, landmark.y, landmark.z);
      this.scene.add(model);
      this.landmarkGroups.push(model);
    });

    // 12. Flora (Pine & Golden Oak Trees, Boulders)
    this.populateFlora();

    // 13. Wildlife AI
    this.wildlife = new WildlifeManager();
    this.wildlife.init(this.scene);

    // Resize handling
    window.addEventListener('resize', this.onResize);

    // Start Loop
    this.lastTime = performance.now();
    this.startLoop();
  }

  private populateFlora() {
    // Deterministic procedural tree planting
    const seedPoints = [
      // Whispering Grove cluster
      { x: -75, z: -55, count: 28, rad: 30, type: 'oak' },
      // Valley pine forests
      { x: 30, z: -30, count: 22, rad: 25, type: 'pine' },
      { x: -25, z: 75, count: 24, rad: 32, type: 'pine' },
      { x: 80, z: 20, count: 18, rad: 28, type: 'pine' },
      // Scattered meadow trees
      { x: -10, z: -65, count: 14, rad: 20, type: 'oak' },
      { x: 50, z: -85, count: 16, rad: 22, type: 'pine' }
    ];

    seedPoints.forEach((cluster) => {
      for (let i = 0; i < cluster.count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * cluster.rad;
        const tx = cluster.x + Math.cos(angle) * dist;
        const tz = cluster.z + Math.sin(angle) * dist;

        // Skip if close to water or landmarks
        const ty = getTerrainHeight(tx, tz);
        if (ty < WATER_LEVEL + 0.3) continue;

        let nearLandmark = false;
        for (const lm of this.landmarks) {
          const d2 = (tx - lm.x) * (tx - lm.x) + (tz - lm.z) * (tz - lm.z);
          if (d2 < (lm.radius + 3) * (lm.radius + 3)) {
            nearLandmark = true;
            break;
          }
        }
        if (nearLandmark) continue;

        const tree = cluster.type === 'oak' ? createOakTreeModel() : createPineTreeModel();
        tree.position.set(tx, ty, tz);
        const scale = 0.8 + Math.random() * 0.45;
        tree.scale.set(scale, scale, scale);
        tree.rotation.y = Math.random() * Math.PI * 2;
        this.scene.add(tree);
      }
    });

    // Boulders
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x5d5952,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true
    });
    for (let i = 0; i < 45; i++) {
      const rx = (Math.random() - 0.5) * 240;
      const rz = (Math.random() - 0.5) * 240;
      // Keep clear clearing around spawn (0, 0)
      if (Math.sqrt(rx * rx + rz * rz) < 16) continue;
      const ry = getTerrainHeight(rx, rz);
      if (ry < WATER_LEVEL - 0.5) continue;

      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2 + Math.random() * 1.5, 0), rockMat);
      rock.position.set(rx, ry + 0.3, rz);
      rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      rock.castShadow = !this.isSoftwareGl;
      rock.receiveShadow = !this.isSoftwareGl;
      this.scene.add(rock);
    }
  }

  private onResize = () => {
    if (this.isDestroyed || !this.container) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  startTitle() {
    this.gameState = 'title';
    this.titleCameraTime = 0;
  }

  startPlaying() {
    this.gameState = 'playing';
    sound.init();
  }

  pause() {
    if (this.gameState === 'playing') this.gameState = 'paused';
  }

  resume() {
    if (this.gameState === 'paused') this.gameState = 'playing';
  }

  toggleCameraMode() {
    this.cameraMode = this.cameraMode === 'third' ? 'first' : 'third';
  }

  cycleWeather(): WeatherType {
    const next = this.weather.cycleNext();
    sound.setWeatherAudio(this.weather.rainIntensity, this.weather.windSpeed);
    return next;
  }

  setWeather(type: WeatherType) {
    this.weather.setWeather(type);
    sound.setWeatherAudio(this.weather.rainIntensity, this.weather.windSpeed);
  }

  // Update loop with software WebGL guard
  private startLoop() {
    const tick = () => {
      if (this.isDestroyed) return;

      const now = performance.now();
      const rawDt = (now - this.lastTime) * 0.001;
      this.lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      this.update(dt);
      this.render();

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    // ALWAYS invoke tick() immediately on start!
    tick();
  }

  private afterDraw(cb: () => void) {
    try {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (this.isDestroyed) return;
        const state = sync && gl.getSyncParameter ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.ALREADY_SIGNALED;
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync && gl.deleteSync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } catch {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private update(dt: number) {
    // 1. Weather Update
    this.weather.update(dt);
    this.dirLight.position.copy(this.weather.sunPos);
    this.dirLight.color.copy(this.weather.sunColor);
    this.dirLight.intensity = this.weather.sunIntensity + this.weather.lightningFlash * 4.0;

    this.hemiLight.color.copy(this.weather.hemisphereSkyColor);
    this.hemiLight.groundColor.copy(this.weather.hemisphereGroundColor);
    this.hemiLight.intensity = this.weather.hemisphereIntensity;

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(this.weather.skyBottom);
    }

    if (this.scene.fog && 'color' in this.scene.fog) {
      this.scene.fog.color.copy(this.weather.fogColor);
      (this.scene.fog as THREE.Fog).near = this.weather.fogNear;
      (this.scene.fog as THREE.Fog).far = this.weather.fogFar;
    }

    const skyUniforms = (this.skyDome.material as THREE.ShaderMaterial).uniforms;
    skyUniforms.topColor.value.copy(this.weather.skyTop);
    skyUniforms.bottomColor.value.copy(this.weather.skyBottom);
    this.skyDome.position.copy(this.camera.position);

    // Water surface undulating ripples
    const time = performance.now() * 0.001;
    this.waterMesh.position.y = WATER_LEVEL + Math.sin(time * 1.5) * 0.08;

    // 2. State Machine Logic
    if (this.gameState === 'title') {
      // Scenic panoramic tour around the world
      this.titleCameraTime += dt * 0.14;
      const camRadius = 90;
      const cx = Math.cos(this.titleCameraTime) * camRadius;
      const cz = Math.sin(this.titleCameraTime) * camRadius;
      const cy = Math.max(getTerrainHeight(cx, cz) + 18, 22);

      this.camera.position.set(cx, cy, cz);
      this.camera.lookAt(0, 10, 0);

      // Idle player mesh
      this.playerMesh.position.set(0, getTerrainHeight(0, 0), 0);
      this.playerMesh.rotation.y = this.titleCameraTime * 0.5;

      // Update wildlife & godrays
      this.wildlife.update(dt, 999, 999, this.weather.currentType === 'sunset' || this.weather.currentType === 'twilight');
      this._vec3A.set(0, 0, 0);
      this.godRays.update(this.camera, this.weather.sunPos, this.weather.godRayIntensity, this._vec3A);
      return;
    }

    if (this.gameState === 'paused') {
      return;
    }

    // 3. Gameplay Active: Physics Step
    const { footstepTriggered, splashed } = updatePlayerPhysics(
      this.playerPhysics,
      this.input,
      this.cameraYaw,
      dt
    );

    // Audio triggers
    if (footstepTriggered) {
      const surface = this.playerPhysics.isSwimming ? 'water' : 'grass';
      sound.playFootstep(surface);
    }
    if (splashed) {
      sound.playFootstep('water');
    }
    if (this.input.jumpJustPressed) {
      sound.playJump();
    }

    // Update Player Model Position and Rotation
    this.playerMesh.position.set(
      this.playerPhysics.x,
      this.playerPhysics.y,
      this.playerPhysics.z
    );
    this.playerMesh.rotation.y = this.playerPhysics.yaw;

    // Player Mesh Animation (Walk/Run/Idle/Cape)
    const pData = this.playerMesh.userData;
    const isMoving = this.playerPhysics.speed > 0.4;
    const animFreq = this.playerPhysics.isSprinting ? 12 : 7;
    const animAngle = isMoving ? Math.sin(time * animFreq) * 0.55 : 0;

    pData.leftLeg.rotation.x = animAngle;
    pData.rightLeg.rotation.x = -animAngle;
    pData.leftArm.rotation.x = -animAngle * 0.8;
    pData.rightArm.rotation.x = animAngle * 0.4;

    // Cape flutter based on speed and wind
    const capeFlutter = Math.sin(time * 10 + this.weather.windTime) * 0.15;
    const capeBackAngle = (this.playerPhysics.speed / 12) * 0.65 + capeFlutter;
    pData.cape.rotation.x = -capeBackAngle;

    // Staff crystal light intensity
    pData.crystalLight.intensity = 1.0 + Math.sin(time * 3) * 0.4;

    // First person vs third person visibility
    this.playerMesh.visible = this.cameraMode !== 'first';

    // 4. Update Camera Rig
    const targetX = this.playerPhysics.x;
    const targetY = this.playerPhysics.y + 1.4;
    const targetZ = this.playerPhysics.z;

    if (this.cameraMode === 'first') {
      this.camera.position.set(targetX, targetY + 0.2, targetZ);
      const lookDist = 5.0;
      const lx = targetX + Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * lookDist;
      const ly = targetY + Math.sin(-this.cameraPitch) * lookDist;
      const lz = targetZ + Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * lookDist;
      this.camera.lookAt(lx, ly, lz);
    } else {
      // Third-person Orbit Camera with terrain collision pull-in
      const desiredDist = this.cameraDistance;
      const offX = -Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * desiredDist;
      const offY = Math.sin(this.cameraPitch) * desiredDist;
      const offZ = -Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * desiredDist;

      let camX = targetX + offX;
      let camY = targetY + offY;
      let camZ = targetZ + offZ;

      // Keep camera above terrain
      const camTerrainY = getTerrainHeight(camX, camZ) + 1.2;
      if (camY < camTerrainY) {
        camY = camTerrainY;
      }

      this.camera.position.x = damp(this.camera.position.x, camX, 18, dt);
      this.camera.position.y = damp(this.camera.position.y, camY, 18, dt);
      this.camera.position.z = damp(this.camera.position.z, camZ, 18, dt);
      this.camera.lookAt(targetX, targetY, targetZ);
    }

    // 5. Update Landmarks & Rune Activation
    let nearestLandmark: { name: string; distance: number; symbol: string } | null = null;
    let shortestDist = Infinity;
    let activatedCount = 0;

    this.landmarks.forEach((lm, idx) => {
      if (lm.activated) activatedCount++;

      const dx = this.playerPhysics.x - lm.x;
      const dz = this.playerPhysics.z - lm.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < shortestDist) {
        shortestDist = dist;
        nearestLandmark = { name: lm.name, distance: Math.round(dist), symbol: lm.runeSymbol };
      }

      const group = this.landmarkGroups[idx];
      const gData = group.userData;

      // Floating rune spin
      if (gData && gData.runeGroup) {
        gData.runeGroup.rotation.y += dt * (lm.activated ? 2.5 : 1.0);
        gData.runeGroup.position.y = 2.4 + Math.sin(time * 2 + idx) * 0.25;
      }

      // Check proximity interaction
      if (!lm.activated && dist < lm.radius) {
        // Can activate with interact key or walking into altar
        if (this.input.interactJustPressed || dist < 2.5) {
          lm.activated = true;
          activatedCount++;
          sound.playRuneActivated();

          if (gData.beam) {
            (gData.beam.material as THREE.MeshBasicMaterial).opacity = 0.55;
          }
          if (gData.runeMat) {
            gData.runeMat.emissiveIntensity = 2.8;
          }
          if (gData.runeLight) {
            gData.runeLight.intensity = 4.0;
          }

          this.callbacks.onRuneActivated(lm, activatedCount);

          if (activatedCount === this.landmarks.length) {
            this.gameState = 'gameover';
            this.callbacks.onVictory();
          }
        }
      }
    });

    // 6. Update Wildlife AI
    this.wildlife.update(
      dt,
      this.playerPhysics.x,
      this.playerPhysics.z,
      this.weather.currentType === 'sunset' || this.weather.currentType === 'twilight'
    );

    // 7. Update God Rays
    this._vec3A.set(this.playerPhysics.x, this.playerPhysics.y, this.playerPhysics.z);
    this.godRays.update(this.camera, this.weather.sunPos, this.weather.godRayIntensity, this._vec3A);

    // 8. Consume single-frame inputs
    this.input.jumpJustPressed = false;
    this.input.interactJustPressed = false;

    // 9. Send throttled state to React HUD
    this.callbacks.onStateUpdate({
      stamina: Math.round(this.playerPhysics.stamina),
      speed: Math.round(this.playerPhysics.speed * 3.6), // km/h
      weather: this.weather.currentType,
      activeRunes: activatedCount,
      totalRunes: this.landmarks.length,
      nearestLandmark,
      playerPos: {
        x: Math.round(this.playerPhysics.x),
        y: Math.round(this.playerPhysics.y),
        z: Math.round(this.playerPhysics.z)
      },
      playerYaw: this.playerPhysics.yaw
    });
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  // Camera Orbit Controls from Mouse/Right Joystick Drag
  applyCameraLook(deltaX: number, deltaY: number) {
    this.cameraYaw += deltaX * 0.0035;
    this.cameraPitch = clamp(this.cameraPitch + deltaY * 0.0035, -0.4, 1.2);
  }

  adjustCameraZoom(delta: number) {
    this.cameraDistance = clamp(this.cameraDistance + delta * 0.005, 3.5, 16.0);
  }

  destroy() {
    this.isDestroyed = true;
    window.removeEventListener('resize', this.onResize);
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
    }
    this.renderer.dispose();
  }
}
