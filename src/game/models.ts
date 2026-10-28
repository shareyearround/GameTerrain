import * as THREE from 'three';
import { Landmark } from './terrain';

/**
 * Composite procedural models built as THREE.Group hierarchies with 3-12 distinct parts.
 * Strict adherence to Three.js directives: no single-primitive models, bottom-center pivots.
 */

export interface PlayerMeshGroup extends THREE.Group {
  userData: {
    leftArm: THREE.Object3D;
    rightArm: THREE.Object3D;
    leftLeg: THREE.Object3D;
    rightLeg: THREE.Object3D;
    cape: THREE.Object3D;
    staff: THREE.Object3D;
    crystalLight: THREE.PointLight;
  };
}

export function createPlayerModel(): PlayerMeshGroup {
  const group = new THREE.Group() as PlayerMeshGroup;

  // 1. Shadow contact disc beneath feet
  const shadowGeo = new THREE.CircleGeometry(0.65, 16);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x050805,
    transparent: true,
    opacity: 0.38,
    depthWrite: false
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.position.y = 0.02;
  group.add(shadowMesh);

  // Common materials with varied roughness / metalness
  const tunicMat = new THREE.MeshStandardMaterial({
    color: 0x2e4638, // Forest green tunic
    roughness: 0.8,
    metalness: 0.05
  });

  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x5a361f, // Warm leather
    roughness: 0.65,
    metalness: 0.15
  });

  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0xb5843a, // Polished bronze accents
    roughness: 0.28,
    metalness: 0.85
  });

  const capeMat = new THREE.MeshStandardMaterial({
    color: 0x8a3324, // Terracotta crimson cloak
    roughness: 0.75,
    metalness: 0.05,
    side: THREE.DoubleSide
  });

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x3d281a,
    roughness: 0.85,
    metalness: 0.02
  });

  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0xffaa44,
    emissive: 0xff8811,
    emissiveIntensity: 1.4,
    roughness: 0.1,
    metalness: 0.3
  });

  // 2. Torso & Tunic (Primary silhouette)
  const torsoGeo = new THREE.CylinderGeometry(0.32, 0.26, 0.7, 8);
  torsoGeo.translate(0, 1.15, 0);
  const torso = new THREE.Mesh(torsoGeo, tunicMat);
  torso.castShadow = true;
  group.add(torso);

  // Belt & Bronze Buckle
  const beltGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.1, 8);
  beltGeo.translate(0, 0.9, 0);
  const belt = new THREE.Mesh(beltGeo, leatherMat);
  group.add(belt);

  const buckleGeo = new THREE.BoxGeometry(0.12, 0.1, 0.08);
  buckleGeo.translate(0, 0.9, 0.25);
  const buckle = new THREE.Mesh(buckleGeo, bronzeMat);
  group.add(buckle);

  // 3. Head & Traveler Cowl / Hood
  const headGeo = new THREE.SphereGeometry(0.22, 12, 10);
  headGeo.translate(0, 1.62, 0);
  const head = new THREE.Mesh(headGeo, tunicMat);
  head.castShadow = true;
  group.add(head);

  // Cowl rim / visor
  const cowlGeo = new THREE.TorusGeometry(0.22, 0.08, 6, 12);
  cowlGeo.rotateX(Math.PI / 2.2);
  cowlGeo.translate(0, 1.66, 0.04);
  const cowl = new THREE.Mesh(cowlGeo, leatherMat);
  group.add(cowl);

  // 4. Limbs (Articulated pivots)
  // Left Leg & Boot
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.16, 0.85, 0);
  const leftLegGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.85, 6);
  leftLegGeo.translate(0, -0.42, 0);
  const leftLeg = new THREE.Mesh(leftLegGeo, leatherMat);
  leftLeg.castShadow = true;
  leftLegPivot.add(leftLeg);
  group.add(leftLegPivot);

  // Right Leg & Boot
  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.16, 0.85, 0);
  const rightLegGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.85, 6);
  rightLegGeo.translate(0, -0.42, 0);
  const rightLeg = new THREE.Mesh(rightLegGeo, leatherMat);
  rightLeg.castShadow = true;
  rightLegPivot.add(rightLeg);
  group.add(rightLegPivot);

  // Left Arm
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.38, 1.4, 0);
  const leftArmGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.65, 6);
  leftArmGeo.translate(0, -0.32, 0);
  const leftArm = new THREE.Mesh(leftArmGeo, tunicMat);
  leftArm.castShadow = true;
  leftArmPivot.add(leftArm);
  group.add(leftArmPivot);

  // Right Arm (holds Staff)
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.38, 1.4, 0);
  const rightArmGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.65, 6);
  rightArmGeo.translate(0, -0.32, 0);
  const rightArm = new THREE.Mesh(rightArmGeo, tunicMat);
  rightArm.castShadow = true;
  rightArmPivot.add(rightArm);

  // Staff
  const staff = new THREE.Group();
  staff.position.set(0.08, -0.35, 0.25);
  const staffShaftGeo = new THREE.CylinderGeometry(0.035, 0.03, 1.85, 6);
  const staffShaft = new THREE.Mesh(staffShaftGeo, woodMat);
  staffShaft.castShadow = true;
  staff.add(staffShaft);

  // Crystal Tip & Bronze Prongs
  const crystalGeo = new THREE.OctahedronGeometry(0.12, 0);
  crystalGeo.translate(0, 0.95, 0);
  const crystal = new THREE.Mesh(crystalGeo, crystalMat);
  staff.add(crystal);

  const crystalLight = new THREE.PointLight(0xff9933, 1.2, 5.0);
  crystalLight.position.set(0, 0.95, 0);
  staff.add(crystalLight);

  rightArmPivot.add(staff);
  group.add(rightArmPivot);

  // 5. Flowing Cape
  const capePivot = new THREE.Group();
  capePivot.position.set(0, 1.45, -0.16);
  const capeGeo = new THREE.PlaneGeometry(0.55, 0.9, 3, 4);
  capeGeo.translate(0, -0.45, -0.05);
  const capeMesh = new THREE.Mesh(capeGeo, capeMat);
  capeMesh.castShadow = true;
  capePivot.add(capeMesh);
  group.add(capePivot);

  group.userData = {
    leftArm: leftArmPivot,
    rightArm: rightArmPivot,
    leftLeg: leftLegPivot,
    rightLeg: rightLegPivot,
    cape: capePivot,
    staff,
    crystalLight
  };

  return group;
}

export interface StagMeshGroup extends THREE.Group {
  userData: {
    headGroup: THREE.Object3D;
    neck: THREE.Object3D;
    legFL: THREE.Object3D;
    legFR: THREE.Object3D;
    legBL: THREE.Object3D;
    legBR: THREE.Object3D;
  };
}

export function createStagModel(): StagMeshGroup {
  const group = new THREE.Group() as StagMeshGroup;

  const hideMat = new THREE.MeshStandardMaterial({
    color: 0x8a532d, // Chestnut deer fur
    roughness: 0.85,
    metalness: 0.05
  });

  const underbellyMat = new THREE.MeshStandardMaterial({
    color: 0xd9c2a7, // Cream underbelly
    roughness: 0.9,
    metalness: 0.02
  });

  const antlerMat = new THREE.MeshStandardMaterial({
    color: 0x47392d, // Antler bone
    roughness: 0.5,
    metalness: 0.1
  });

  const hoofMat = new THREE.MeshStandardMaterial({
    color: 0x1f1813,
    roughness: 0.4,
    metalness: 0.2
  });

  // 1. Torso
  const bodyGeo = new THREE.CylinderGeometry(0.42, 0.48, 1.5, 8);
  bodyGeo.rotateX(Math.PI / 2);
  bodyGeo.translate(0, 1.25, 0);
  const body = new THREE.Mesh(bodyGeo, hideMat);
  body.castShadow = true;
  group.add(body);

  // Underbelly accent
  const bellyGeo = new THREE.BoxGeometry(0.4, 0.2, 1.1);
  bellyGeo.translate(0, 0.98, 0);
  const belly = new THREE.Mesh(bellyGeo, underbellyMat);
  group.add(belly);

  // 2. Neck and Head
  const neckPivot = new THREE.Group();
  neckPivot.position.set(0, 1.4, 0.65);
  const neckGeo = new THREE.CylinderGeometry(0.24, 0.32, 0.75, 7);
  neckGeo.rotateX(-Math.PI / 4.5);
  neckGeo.translate(0, 0.32, 0.2);
  const neck = new THREE.Mesh(neckGeo, hideMat);
  neck.castShadow = true;
  neckPivot.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.6, 0.45);

  const headGeo = new THREE.ConeGeometry(0.22, 0.55, 6);
  headGeo.rotateX(-Math.PI / 2.2);
  const headMesh = new THREE.Mesh(headGeo, hideMat);
  headGroup.add(headMesh);

  // Ears
  const earL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 4), hideMat);
  earL.position.set(-0.2, 0.18, -0.05);
  earL.rotation.z = 0.5;
  headGroup.add(earL);

  const earR = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 4), hideMat);
  earR.position.set(0.2, 0.18, -0.05);
  earR.rotation.z = -0.5;
  headGroup.add(earR);

  // Antlers (Majestic branching tines)
  [-1, 1].forEach((side) => {
    const mainBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.8, 5), antlerMat);
    mainBeam.position.set(side * 0.16, 0.4, -0.05);
    mainBeam.rotation.z = side * 0.45;
    mainBeam.rotation.x = -0.25;

    const tine1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.35, 4), antlerMat);
    tine1.position.set(0, 0.15, 0.1);
    tine1.rotation.x = 0.6;
    mainBeam.add(tine1);

    const tine2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.3, 4), antlerMat);
    tine2.position.set(side * 0.08, 0.3, 0);
    tine2.rotation.z = side * 0.5;
    mainBeam.add(tine2);

    headGroup.add(mainBeam);
  });

  neckPivot.add(headGroup);
  group.add(neckPivot);

  // 3. Four Legs
  const legGeo = new THREE.CylinderGeometry(0.09, 0.065, 1.1, 5);
  legGeo.translate(0, -0.55, 0);

  const createLeg = (x: number, z: number) => {
    const legP = new THREE.Group();
    legP.position.set(x, 1.15, z);
    const legM = new THREE.Mesh(legGeo, hideMat);
    legM.castShadow = true;
    legP.add(legM);

    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.12, 5), hoofMat);
    hoof.position.set(0, -1.05, 0);
    legP.add(hoof);

    return legP;
  };

  const legFL = createLeg(-0.25, 0.5);
  const legFR = createLeg(0.25, 0.5);
  const legBL = createLeg(-0.26, -0.55);
  const legBR = createLeg(0.26, -0.55);

  group.add(legFL, legFR, legBL, legBR);

  // Small tail
  const tailGeo = new THREE.ConeGeometry(0.1, 0.26, 4);
  tailGeo.rotateX(-Math.PI / 1.5);
  tailGeo.translate(0, 1.3, -0.8);
  const tail = new THREE.Mesh(tailGeo, underbellyMat);
  group.add(tail);

  group.userData = {
    headGroup,
    neck: neckPivot,
    legFL,
    legFR,
    legBL,
    legBR
  };

  return group;
}

export interface HawkMeshGroup extends THREE.Group {
  userData: {
    leftWing: THREE.Object3D;
    rightWing: THREE.Object3D;
  };
}

export function createHawkModel(): HawkMeshGroup {
  const group = new THREE.Group() as HawkMeshGroup;

  const featherMat = new THREE.MeshStandardMaterial({
    color: 0x4a3224, // Dark golden-brown plumage
    roughness: 0.8,
    metalness: 0.05
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd9a43a, // Golden raptor crest & beak
    roughness: 0.35,
    metalness: 0.6
  });

  // Body
  const bodyGeo = new THREE.ConeGeometry(0.3, 1.2, 5);
  bodyGeo.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, featherMat);
  group.add(body);

  // Head and beak
  const headGeo = new THREE.SphereGeometry(0.2, 6, 6);
  headGeo.translate(0, 0.1, 0.6);
  const head = new THREE.Mesh(headGeo, featherMat);
  group.add(head);

  const beakGeo = new THREE.ConeGeometry(0.08, 0.25, 4);
  beakGeo.rotateX(Math.PI / 2.2);
  beakGeo.translate(0, 0.05, 0.8);
  const beak = new THREE.Mesh(beakGeo, goldMat);
  group.add(beak);

  // Wings (Articulated pivots)
  const wingGeo = new THREE.BoxGeometry(1.6, 0.04, 0.5);
  wingGeo.translate(0.8, 0, 0);

  const leftWing = new THREE.Group();
  leftWing.position.set(-0.15, 0.08, 0.1);
  const leftWingMesh = new THREE.Mesh(wingGeo, featherMat);
  leftWingMesh.rotation.y = Math.PI;
  leftWing.add(leftWingMesh);
  group.add(leftWing);

  const rightWing = new THREE.Group();
  rightWing.position.set(0.15, 0.08, 0.1);
  const rightWingMesh = new THREE.Mesh(wingGeo, featherMat);
  rightWing.add(rightWingMesh);
  group.add(rightWing);

  // Tail feathers
  const tailGeo = new THREE.BoxGeometry(0.5, 0.03, 0.6);
  tailGeo.translate(0, 0, -0.75);
  const tail = new THREE.Mesh(tailGeo, featherMat);
  group.add(tail);

  group.userData = {
    leftWing,
    rightWing
  };

  return group;
}

/**
 * Procedural Pine Tree with 3 distinct foliage tiers and trunk
 */
export function createPineTreeModel(): THREE.Group {
  const tree = new THREE.Group();

  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x483220,
    roughness: 0.9,
    metalness: 0.05
  });

  const foliageMat1 = new THREE.MeshStandardMaterial({
    color: 0x224424,
    roughness: 0.85,
    metalness: 0.02,
    flatShading: true
  });

  const foliageMat2 = new THREE.MeshStandardMaterial({
    color: 0x2e5932,
    roughness: 0.8,
    metalness: 0.02,
    flatShading: true
  });

  // Trunk
  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.55, 3.5, 6);
  trunkGeo.translate(0, 1.75, 0);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.castShadow = true;
  tree.add(trunk);

  // 3 Foliage Tiers
  const tiers = [
    { r: 2.4, h: 3.2, y: 3.2, mat: foliageMat1 },
    { r: 1.9, h: 2.8, y: 4.8, mat: foliageMat2 },
    { r: 1.3, h: 2.4, y: 6.2, mat: foliageMat1 }
  ];

  tiers.forEach((t) => {
    const geo = new THREE.ConeGeometry(t.r, t.h, 7);
    geo.translate(0, t.y, 0);
    const m = new THREE.Mesh(geo, t.mat);
    m.castShadow = true;
    m.receiveShadow = true;
    tree.add(m);
  });

  return tree;
}

/**
 * Procedural Golden Oak Tree with autumn foliage
 */
export function createOakTreeModel(): THREE.Group {
  const tree = new THREE.Group();

  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x3d2919,
    roughness: 0.9,
    metalness: 0.05
  });

  const oakMat = new THREE.MeshStandardMaterial({
    color: 0xc48225, // Golden autumn canopy
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true
  });

  // Gnarled Trunk
  const trunkGeo = new THREE.CylinderGeometry(0.45, 0.75, 4.0, 7);
  trunkGeo.translate(0, 2.0, 0);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.castShadow = true;
  tree.add(trunk);

  // 4 Canopy clusters
  const clusters = [
    { r: 2.2, x: 0, y: 4.8, z: 0 },
    { r: 1.8, x: -1.2, y: 4.2, z: 0.6 },
    { r: 1.7, x: 1.1, y: 4.4, z: -0.5 },
    { r: 1.4, x: 0.2, y: 5.6, z: 0.4 }
  ];

  clusters.forEach((c) => {
    const geo = new THREE.DodecahedronGeometry(c.r, 1);
    geo.translate(c.x, c.y, c.z);
    const m = new THREE.Mesh(geo, oakMat);
    m.castShadow = true;
    tree.add(m);
  });

  return tree;
}

/**
 * Procedural Landmark Structure (Altar, ancient monoliths, glowing rune emblem)
 */
export function createLandmarkModel(landmark: Landmark): THREE.Group {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x6e6b66,
    roughness: 0.85,
    metalness: 0.1
  });

  const carvedMat = new THREE.MeshStandardMaterial({
    color: 0x54524e,
    roughness: 0.7,
    metalness: 0.2
  });

  const runeMat = new THREE.MeshStandardMaterial({
    color: landmark.color,
    emissive: landmark.color,
    emissiveIntensity: landmark.activated ? 2.5 : 0.8,
    roughness: 0.2,
    metalness: 0.6
  });

  // Base dais / stone platform
  const daisGeo = new THREE.CylinderGeometry(3.6, 4.0, 0.6, 12);
  daisGeo.translate(0, 0.3, 0);
  const dais = new THREE.Mesh(daisGeo, stoneMat);
  dais.receiveShadow = true;
  group.add(dais);

  // Central Altar Pedestal
  const altarGeo = new THREE.BoxGeometry(1.4, 1.2, 1.4);
  altarGeo.translate(0, 1.1, 0);
  const altar = new THREE.Mesh(altarGeo, carvedMat);
  altar.castShadow = true;
  group.add(altar);

  // 4 Surrounding Monolith Pillars
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const px = Math.cos(angle) * 2.8;
    const pz = Math.sin(angle) * 2.8;

    const pillarGeo = new THREE.BoxGeometry(0.65, 3.4 + (i % 2) * 0.6, 0.65);
    pillarGeo.translate(0, 1.7, 0);
    const pillar = new THREE.Mesh(pillarGeo, stoneMat);
    pillar.position.set(px, 0.4, pz);
    pillar.rotation.y = angle;
    pillar.castShadow = true;
    group.add(pillar);
  }

  // Floating ancient rune emblem (Octahedron + Torus core)
  const runeGroup = new THREE.Group();
  runeGroup.position.set(0, 2.4, 0);

  const coreGeo = new THREE.OctahedronGeometry(0.38, 0);
  const coreMesh = new THREE.Mesh(coreGeo, runeMat);
  runeGroup.add(coreMesh);

  const ringGeo = new THREE.TorusGeometry(0.65, 0.05, 6, 16);
  const ringMesh = new THREE.Mesh(ringGeo, runeMat);
  runeGroup.add(ringMesh);

  group.add(runeGroup);

  // Beacon light
  const runeLight = new THREE.PointLight(landmark.color, landmark.activated ? 3.5 : 1.2, 18);
  runeLight.position.set(0, 2.6, 0);
  group.add(runeLight);

  // Skyward beam (visible when activated)
  const beamGeo = new THREE.CylinderGeometry(0.2, 0.8, 80, 8);
  beamGeo.translate(0, 40, 0);
  const beamMat = new THREE.MeshBasicMaterial({
    color: landmark.color,
    transparent: true,
    opacity: landmark.activated ? 0.45 : 0.0,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  group.add(beam);

  group.userData = {
    runeGroup,
    runeLight,
    beam,
    runeMat
  };

  return group;
}
