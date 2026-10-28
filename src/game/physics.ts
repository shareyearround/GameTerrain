import { getTerrainHeight, getTerrainSlope, WATER_LEVEL } from './terrain';
import { clamp } from './math';

export interface PlayerPhysicsState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  isGrounded: boolean;
  isSwimming: boolean;
  isSprinting: boolean;
  isSliding: boolean;
  stamina: number; // 0 - 100
  maxStamina: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  footstepDistance: number;
  speed: number;
}

export interface PlayerInput {
  moveX: number; // -1 to 1 (left/right)
  moveZ: number; // -1 to 1 (forward/backward)
  jumpJustPressed: boolean;
  sprintHeld: boolean;
  interactJustPressed: boolean;
}

export const GRAVITY = 26.0;
export const WALK_SPEED = 7.0;
export const SPRINT_SPEED = 12.5;
export const SWIM_SPEED = 5.2;
export const JUMP_VELOCITY = 10.0;
export const MAX_SLOPE_WALKABLE = 0.72; // ~41 degrees

export function createInitialPhysicsState(spawnX = 0, spawnZ = 0): PlayerPhysicsState {
  const groundY = getTerrainHeight(spawnX, spawnZ);
  return {
    x: spawnX,
    y: Math.max(groundY, WATER_LEVEL),
    z: spawnZ,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: 0,
    pitch: 0,
    isGrounded: true,
    isSwimming: false,
    isSprinting: false,
    isSliding: false,
    stamina: 100,
    maxStamina: 100,
    coyoteTimer: 0.1,
    jumpBufferTimer: 0,
    footstepDistance: 0,
    speed: 0
  };
}

/**
 * Pure physics simulation update step.
 * Clamps dt, handles input, slope sliding, swimming, stamina, and gravity.
 */
export function updatePlayerPhysics(
  state: PlayerPhysicsState,
  input: PlayerInput,
  cameraYaw: number,
  rawDt: number
): { footstepTriggered: boolean; splashed: boolean } {
  const dt = Math.min(rawDt, 0.05);
  let footstepTriggered = false;
  let splashed = false;

  const currentGroundY = getTerrainHeight(state.x, state.z);
  const inWater = state.y <= WATER_LEVEL + 0.1;
  const wasInWater = state.isSwimming;
  state.isSwimming = inWater && currentGroundY < WATER_LEVEL - 0.4;

  if (state.isSwimming && !wasInWater) {
    splashed = true;
  }

  // Update input buffer & coyote timers
  if (input.jumpJustPressed) {
    state.jumpBufferTimer = 0.14;
  } else {
    state.jumpBufferTimer = Math.max(0, state.jumpBufferTimer - dt);
  }

  if (state.isGrounded) {
    state.coyoteTimer = 0.12;
  } else {
    state.coyoteTimer = Math.max(0, state.coyoteTimer - dt);
  }

  // Stamina logic
  const wantsSprint = input.sprintHeld && (Math.abs(input.moveX) > 0.1 || Math.abs(input.moveZ) > 0.1);
  if (wantsSprint && state.stamina > 5) {
    state.isSprinting = true;
    state.stamina = Math.max(0, state.stamina - dt * 22);
  } else {
    state.isSprinting = false;
    state.stamina = Math.min(state.maxStamina, state.stamina + dt * 18);
  }

  // Target speed
  let targetMaxSpeed = WALK_SPEED;
  if (state.isSwimming) {
    targetMaxSpeed = SWIM_SPEED;
  } else if (state.isSprinting) {
    targetMaxSpeed = SPRINT_SPEED;
  }

  // Convert input vector relative to camera yaw
  const inputLen = Math.sqrt(input.moveX * input.moveX + input.moveZ * input.moveZ);
  let worldWishX = 0;
  let worldWishZ = 0;

  if (inputLen > 0.05) {
    const normX = input.moveX / Math.max(1, inputLen);
    const normZ = input.moveZ / Math.max(1, inputLen);

    // Camera space to world space
    const cosY = Math.cos(cameraYaw);
    const sinY = Math.sin(cameraYaw);

    worldWishX = (normX * cosY + normZ * sinY) * Math.min(1, inputLen);
    worldWishZ = (-normX * sinY + normZ * cosY) * Math.min(1, inputLen);

    // Smoothly turn character towards motion
    state.yaw = Math.atan2(worldWishX, worldWishZ);
  }

  // Check slope at current position
  const slope = getTerrainSlope(state.x, state.z);
  state.isSliding = slope > MAX_SLOPE_WALKABLE && state.isGrounded && !state.isSwimming;

  // Horizontal acceleration & drag
  const accelRate = state.isGrounded ? 18.0 : 6.0;
  const dragRate = state.isGrounded ? 12.0 : 2.5;

  const targetVx = worldWishX * targetMaxSpeed;
  const targetVz = worldWishZ * targetMaxSpeed;

  if (inputLen > 0.05) {
    state.vx += (targetVx - state.vx) * Math.min(1, accelRate * dt);
    state.vz += (targetVz - state.vz) * Math.min(1, accelRate * dt);
  } else {
    state.vx += (0 - state.vx) * Math.min(1, dragRate * dt);
    state.vz += (0 - state.vz) * Math.min(1, dragRate * dt);
  }

  // Slope sliding push
  if (state.isSliding) {
    // Normal gives direction of steepest descent
    const eps = 0.5;
    const hL = getTerrainHeight(state.x - eps, state.z);
    const hR = getTerrainHeight(state.x + eps, state.z);
    const hD = getTerrainHeight(state.x, state.z - eps);
    const hU = getTerrainHeight(state.x, state.z + eps);
    const downhillX = (hL - hR) * 0.5;
    const downhillZ = (hD - hU) * 0.5;
    state.vx += downhillX * 14 * dt;
    state.vz += downhillZ * 14 * dt;
  }

  // Jump execution
  const canJump = (state.coyoteTimer > 0 || state.isSwimming);
  if (state.jumpBufferTimer > 0 && canJump) {
    state.vy = state.isSwimming ? JUMP_VELOCITY * 0.75 : JUMP_VELOCITY;
    state.isGrounded = false;
    state.coyoteTimer = 0;
    state.jumpBufferTimer = 0;
  }

  // Vertical movement & gravity
  if (state.isSwimming) {
    // Buoyancy in water
    const waterDepth = WATER_LEVEL - state.y;
    if (waterDepth > 0) {
      state.vy += (waterDepth * 15 - state.vy * 6) * dt;
    } else {
      state.vy -= GRAVITY * 0.3 * dt;
    }
  } else {
    state.vy -= GRAVITY * dt;
  }

  // Apply velocity to position
  state.x += state.vx * dt;
  state.z += state.vz * dt;
  state.y += state.vy * dt;

  // Clamp within world boundary (-160 to 160)
  state.x = clamp(state.x, -160, 160);
  state.z = clamp(state.z, -160, 160);

  // Ground collision resolve
  const newGroundY = getTerrainHeight(state.x, state.z);
  if (state.y <= newGroundY) {
    state.y = newGroundY;
    if (state.vy < 0) {
      state.vy = 0;
    }
    state.isGrounded = true;
  } else {
    // Small step-up tolerance
    if (state.y - newGroundY < 0.15 && state.vy <= 0) {
      state.y = newGroundY;
      state.isGrounded = true;
      state.vy = 0;
    } else {
      state.isGrounded = false;
    }
  }

  // Water level cap when swimming
  if (state.isSwimming && state.y < WATER_LEVEL - 0.4) {
    state.y = WATER_LEVEL - 0.4;
  }

  // Current horizontal speed
  state.speed = Math.sqrt(state.vx * state.vx + state.vz * state.vz);

  // Footstep accumulator
  if (state.isGrounded && state.speed > 0.5) {
    state.footstepDistance += state.speed * dt;
    const stepInterval = state.isSprinting ? 2.2 : 1.7;
    if (state.footstepDistance >= stepInterval) {
      state.footstepDistance = 0;
      footstepTriggered = true;
    }
  }

  return { footstepTriggered, splashed };
}
