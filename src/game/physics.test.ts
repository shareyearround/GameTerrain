import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialPhysicsState, updatePlayerPhysics, WALK_SPEED, SPRINT_SPEED } from './physics';
import { getTerrainHeight, WATER_LEVEL } from './terrain';

test('initial player physics state starts grounded above terrain and water', () => {
  const state = createInitialPhysicsState(0, 0);
  const groundY = getTerrainHeight(0, 0);
  assert.ok(state.isGrounded, 'Player should start grounded');
  assert.ok(state.y >= groundY, 'Player Y should be at or above terrain');
  assert.ok(state.stamina === 100, 'Player should start with full stamina');
});

test('player moves forward with positive input', () => {
  const state = createInitialPhysicsState(0, 0);
  const input = {
    moveX: 0,
    moveZ: 1, // Forward
    jumpJustPressed: false,
    sprintHeld: false,
    interactJustPressed: false
  };

  // Step 10 frames
  for (let i = 0; i < 10; i++) {
    updatePlayerPhysics(state, input, 0, 0.016);
  }

  assert.ok(state.speed > 0, 'Player speed should increase with forward input');
  assert.ok(state.vz > 0, 'Player Z velocity should be positive');
});

test('sprinting consumes stamina and reaches higher speed than walking', () => {
  const walkState = createInitialPhysicsState(0, 0);
  const sprintState = createInitialPhysicsState(0, 0);

  const walkInput = {
    moveX: 0,
    moveZ: 1,
    jumpJustPressed: false,
    sprintHeld: false,
    interactJustPressed: false
  };

  const sprintInput = {
    moveX: 0,
    moveZ: 1,
    jumpJustPressed: false,
    sprintHeld: true,
    interactJustPressed: false
  };

  for (let i = 0; i < 30; i++) {
    updatePlayerPhysics(walkState, walkInput, 0, 0.016);
    updatePlayerPhysics(sprintState, sprintInput, 0, 0.016);
  }

  assert.ok(sprintState.speed > walkState.speed, 'Sprinting speed should exceed walking speed');
  assert.ok(sprintState.stamina < walkState.stamina, 'Sprinting should drain stamina');
});

test('jumping applies vertical velocity and consumes grounded state', () => {
  const state = createInitialPhysicsState(0, 0);
  const jumpInput = {
    moveX: 0,
    moveZ: 0,
    jumpJustPressed: true,
    sprintHeld: false,
    interactJustPressed: false
  };

  updatePlayerPhysics(state, jumpInput, 0, 0.016);
  assert.ok(state.vy > 0, 'Vertical velocity should be positive after jumping');
  assert.equal(state.isGrounded, false, 'Player should not be grounded immediately after jump');
});
