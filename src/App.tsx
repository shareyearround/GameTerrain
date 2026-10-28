import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/Engine';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { VirtualJoystick } from './components/VirtualJoystick';
import { PauseModal, VictoryModal, DiscoveryToast } from './components/Modals';
import { WeatherType } from './game/weather';
import { Landmark } from './game/terrain';
import { sound } from './game/audio';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // High-level Game State
  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused' | 'gameover'>('title');
  const [activeToast, setActiveToast] = useState<{ landmark: Landmark; total: number } | null>(null);
  const [runTimeSeconds, setRunTimeSeconds] = useState(0);

  // HUD Metrics
  const [hudData, setHudData] = useState({
    stamina: 100,
    speed: 0,
    weather: 'sunset' as WeatherType,
    activeRunes: 0,
    totalRunes: 5,
    nearestLandmark: null as { name: string; distance: number; symbol: string } | null,
    playerPos: { x: 0, y: 0, z: 0 }
  });

  const [landmarksState, setLandmarksState] = useState<Landmark[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraMode, setCameraMode] = useState<'third' | 'first' | 'cinematic'>('third');
  const [showJoysticks, setShowJoysticks] = useState(true);
  const [isSprinting, setIsSprinting] = useState(false);

  // Keyboard Continuous Inputs
  const keysDown = useRef<Record<string, boolean>>({});

  // 1. Initialize Game Engine once
  useEffect(() => {
    if (!canvasMountRef.current) return;

    // Check autostart query parameter
    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart') === '1';

    const engine = new GameEngine(canvasMountRef.current, {
      onRuneActivated: (landmark, totalActivated) => {
        setActiveToast({ landmark, total: totalActivated });
        setTimeout(() => setActiveToast(null), 4200);

        setLandmarksState((prev) =>
          prev.map((lm) => (lm.id === landmark.id ? { ...lm, activated: true } : lm))
        );
      },
      onStateUpdate: (data) => {
        setHudData({
          stamina: data.stamina,
          speed: data.speed,
          weather: data.weather,
          activeRunes: data.activeRunes,
          totalRunes: data.totalRunes,
          nearestLandmark: data.nearestLandmark,
          playerPos: data.playerPos
        });
      },
      onVictory: () => {
        setGameState('gameover');
      }
    });

    engineRef.current = engine;
    setLandmarksState(engine.landmarks);

    if (autostart) {
      engine.startPlaying();
      setGameState('playing');
    } else {
      engine.startTitle();
      setGameState('title');
    }

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Sync document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Exploration run timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      setRunTimeSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  // 2. Keyboard & Window Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysDown.current[e.code] = true;

      if (!engineRef.current) return;

      // Escape or P -> Pause
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (gameState === 'playing') {
          engineRef.current.pause();
          setGameState('paused');
        } else if (gameState === 'paused') {
          engineRef.current.resume();
          setGameState('playing');
        }
      }

      // Space -> Jump (One-shot)
      if (e.code === 'Space' && gameState === 'playing') {
        e.preventDefault();
        engineRef.current.input.jumpJustPressed = true;
      }

      // E -> Interact (One-shot)
      if (e.code === 'KeyE' && gameState === 'playing') {
        e.preventDefault();
        engineRef.current.input.interactJustPressed = true;
      }

      // V -> Toggle Camera
      if (e.code === 'KeyV' && gameState === 'playing') {
        engineRef.current.toggleCameraMode();
        setCameraMode(engineRef.current.cameraMode);
      }

      // M -> Toggle Mute
      if (e.code === 'KeyM') {
        const muted = sound.toggleMute();
        setIsMuted(muted);
      }

      // H -> Toggle Dock
      updateKeyboardInput();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.current[e.code] = false;
      updateKeyboardInput();
    };

    const handleBlur = () => {
      keysDown.current = {};
      if (engineRef.current) {
        engineRef.current.input.moveX = 0;
        engineRef.current.input.moveZ = 0;
        engineRef.current.input.sprintHeld = false;
        engineRef.current.input.jumpJustPressed = false;
      }
    };

    const updateKeyboardInput = () => {
      if (!engineRef.current || gameState !== 'playing') return;

      let mx = 0;
      let mz = 0;

      if (keysDown.current['KeyW'] || keysDown.current['ArrowUp']) mz += 1;
      if (keysDown.current['KeyS'] || keysDown.current['ArrowDown']) mz -= 1;
      if (keysDown.current['KeyA'] || keysDown.current['ArrowLeft']) mx -= 1;
      if (keysDown.current['KeyD'] || keysDown.current['ArrowRight']) mx += 1;

      const sprint = !!(keysDown.current['ShiftLeft'] || keysDown.current['ShiftRight'] || isSprinting);

      engineRef.current.input.moveX = mx;
      engineRef.current.input.moveZ = mz;
      engineRef.current.input.sprintHeld = sprint;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [gameState, isSprinting]);

  // 3. Mouse Drag on Canvas for Camera Orbit Look
  useEffect(() => {
    const el = canvasMountRef.current;
    if (!el) return;

    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const onMouseDown = (e: MouseEvent) => {
      // Only drag with left mouse button if not clicking UI elements
      if (e.button === 0 && (e.target as HTMLElement).tagName === 'CANVAS') {
        isDragging = true;
        prevX = e.clientX;
        prevY = e.clientY;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !engineRef.current) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;
      engineRef.current.applyCameraLook(dx, dy);
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (!engineRef.current) return;
      engineRef.current.adjustCameraZoom(e.deltaY);
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  // UI Handlers
  const handleStartGame = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.startPlaying();
    setGameState('playing');
  }, []);

  const handlePause = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.pause();
    setGameState('paused');
  }, []);

  const handleResume = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.resume();
    setGameState('playing');
  }, []);

  const handleRestart = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.playerPhysics.x = 0;
    engineRef.current.playerPhysics.z = 0;
    engineRef.current.playerPhysics.vx = 0;
    engineRef.current.playerPhysics.vz = 0;
    engineRef.current.playerPhysics.vy = 0;
    engineRef.current.resume();
    setGameState('playing');
  }, []);

  const handleTitle = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.startTitle();
    setGameState('title');
  }, []);

  const handleCycleWeather = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.cycleWeather();
  }, []);

  const handleSelectWeather = useCallback((type: WeatherType) => {
    if (!engineRef.current) return;
    engineRef.current.setWeather(type);
  }, []);

  const handleToggleCamera = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.toggleCameraMode();
    setCameraMode(engineRef.current.cameraMode);
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  }, []);

  // Virtual Joystick Handlers
  const handleJoystickMove = useCallback((normX: number, normZ: number) => {
    if (!engineRef.current) return;
    engineRef.current.input.moveX = normX;
    engineRef.current.input.moveZ = normZ;
  }, []);

  const handleJoystickLook = useCallback((deltaX: number, deltaY: number) => {
    if (!engineRef.current) return;
    engineRef.current.applyCameraLook(deltaX, deltaY);
  }, []);

  const handleJoystickJump = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.input.jumpJustPressed = true;
  }, []);

  const handleJoystickInteract = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.input.interactJustPressed = true;
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-stone-950 font-sans select-none">
      {/* Isolated Three.js Canvas Container */}
      <div
        ref={canvasMountRef}
        data-testid="three-canvas-container"
        className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing"
      />

      {/* Title Screen Overlay */}
      {gameState === 'title' && <TitleScreen onStart={handleStartGame} />}

      {/* Gameplay HUD */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <HUD
          stamina={hudData.stamina}
          speed={hudData.speed}
          weather={hudData.weather}
          activeRunes={hudData.activeRunes}
          totalRunes={hudData.totalRunes}
          landmarks={landmarksState}
          nearestLandmark={hudData.nearestLandmark}
          playerPos={hudData.playerPos}
          isMuted={isMuted}
          cameraMode={cameraMode}
          onToggleMute={handleToggleMute}
          onToggleCamera={handleToggleCamera}
          onCycleWeather={handleCycleWeather}
          onPause={handlePause}
          showJoysticks={showJoysticks}
          onToggleJoysticks={() => setShowJoysticks(!showJoysticks)}
        />
      )}

      {/* On-Screen Touch/Mouse Virtual Joysticks */}
      {gameState === 'playing' && showJoysticks && (
        <VirtualJoystick
          onMove={handleJoystickMove}
          onLook={handleJoystickLook}
          onJump={handleJoystickJump}
          onSprintToggle={(s) => {
            setIsSprinting(s);
            if (engineRef.current) engineRef.current.input.sprintHeld = s;
          }}
          onInteract={handleJoystickInteract}
          isSprinting={isSprinting}
        />
      )}

      {/* Discovery Toast */}
      {activeToast && (
        <DiscoveryToast
          landmark={activeToast.landmark}
          totalActivated={activeToast.total}
        />
      )}

      {/* Pause Modal */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onTitle={handleTitle}
          currentWeather={hudData.weather}
          onSelectWeather={handleSelectWeather}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Victory Modal */}
      {gameState === 'gameover' && (
        <VictoryModal
          onContinue={() => {
            if (engineRef.current) {
              engineRef.current.resume();
              setGameState('playing');
            }
          }}
          onRestart={() => {
            // Reset Runes
            if (engineRef.current) {
              engineRef.current.landmarks.forEach((lm) => (lm.activated = false));
              setLandmarksState([...engineRef.current.landmarks]);
              handleRestart();
            }
          }}
          runTimeSeconds={runTimeSeconds}
        />
      )}
    </div>
  );
}
