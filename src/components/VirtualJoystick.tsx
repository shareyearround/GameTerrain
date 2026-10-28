import React, { useRef, useState, useEffect } from 'react';

interface VirtualJoystickProps {
  onMove: (moveX: number, moveZ: number) => void;
  onLook: (lookX: number, lookY: number) => void;
  onJump: () => void;
  onSprintToggle: (sprinting: boolean) => void;
  onInteract: () => void;
  isSprinting: boolean;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onMove,
  onLook,
  onJump,
  onSprintToggle,
  onInteract,
  isSprinting
}) => {
  const leftStickRef = useRef<HTMLDivElement>(null);
  const [leftThumbPos, setLeftThumbPos] = useState({ x: 0, y: 0 });
  const [isLeftActive, setIsLeftActive] = useState(false);

  // Right Look Trackpad
  const rightPadRef = useRef<HTMLDivElement>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);

  // Left Joystick touch handlers
  const handleLeftStart = (clientX: number, clientY: number) => {
    setIsLeftActive(true);
    handleLeftMove(clientX, clientY);
  };

  const handleLeftMove = (clientX: number, clientY: number) => {
    if (!leftStickRef.current) return;
    const rect = leftStickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const maxRadius = rect.width / 2;

    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const thumbX = Math.cos(angle) * clampedDist;
    const thumbY = Math.sin(angle) * clampedDist;

    setLeftThumbPos({ x: thumbX, y: thumbY });

    // Normalized move vector (-1 to 1)
    // dy is down on screen, which is backward in 3D (-Z or +Z depending on convention)
    const normX = thumbX / maxRadius;
    const normZ = -thumbY / maxRadius; // Up is forward
    onMove(normX, normZ);
  };

  const handleLeftEnd = () => {
    setIsLeftActive(false);
    setLeftThumbPos({ x: 0, y: 0 });
    onMove(0, 0);
  };

  // Right Trackpad for camera looking
  const handleRightStart = (clientX: number, clientY: number) => {
    lastTouchRef.current = { x: clientX, y: clientY };
  };

  const handleRightMove = (clientX: number, clientY: number) => {
    if (!lastTouchRef.current) return;
    const dx = clientX - lastTouchRef.current.x;
    const dy = clientY - lastTouchRef.current.y;
    lastTouchRef.current = { x: clientX, y: clientY };

    onLook(dx * 1.5, dy * 1.5);
  };

  const handleRightEnd = () => {
    lastTouchRef.current = null;
  };

  // Global mouse up safety
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isLeftActive) handleLeftEnd();
      handleRightEnd();
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isLeftActive]);

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-10">
      {/* Left Joystick: Movement */}
      <div className="absolute bottom-6 left-6 pointer-events-auto">
        <div
          ref={leftStickRef}
          aria-label="Movement Joystick"
          className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-amber-500/40 bg-stone-950/60 relative touch-none shadow-lg flex items-center justify-center cursor-pointer"
          onMouseDown={(e) => handleLeftStart(e.clientX, e.clientY)}
          onMouseMove={(e) => {
            if (isLeftActive) handleLeftMove(e.clientX, e.clientY);
          }}
          onMouseUp={handleLeftEnd}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            handleLeftStart(touch.clientX, touch.clientY);
          }}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            handleLeftMove(touch.clientX, touch.clientY);
          }}
          onTouchEnd={handleLeftEnd}
        >
          {/* Inner D-Pad Guides */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30 text-[10px] text-amber-300 font-bold">
            <span className="absolute top-2">▲</span>
            <span className="absolute bottom-2">▼</span>
            <span className="absolute left-2">◀</span>
            <span className="absolute right-2">▶</span>
          </div>

          {/* Thumb Knob */}
          <div
            className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border border-amber-200/60 shadow-md transform transition-transform duration-75 flex items-center justify-center"
            style={{
              transform: `translate(${leftThumbPos.x}px, ${leftThumbPos.y}px)`
            }}
          >
            <div className="w-3 h-3 rounded-full bg-amber-100/80" />
          </div>
        </div>
        <div className="text-center text-[10px] uppercase font-bold text-amber-300/60 mt-1">
          Move Joystick
        </div>
      </div>

      {/* Right Look Area & Action Buttons */}
      <div className="absolute bottom-6 right-6 pointer-events-auto flex flex-col items-end gap-3">
        {/* Action Button Diamond */}
        <div className="flex items-center gap-2 mb-2">
          {/* Sprint Toggle */}
          <button
            onClick={() => onSprintToggle(!isSprinting)}
            className={`w-12 h-12 rounded-full border border-amber-500/40 font-bold text-xs shadow-lg flex flex-col items-center justify-center transition active:scale-95 ${
              isSprinting
                ? 'bg-amber-500 text-stone-950'
                : 'bg-stone-950/70 text-amber-300 hover:bg-stone-900/80'
            }`}
          >
            <span className="text-[14px]">⚡</span>
            <span className="text-[9px] uppercase">Sprint</span>
          </button>

          {/* Interact Button */}
          <button
            onClick={onInteract}
            className="w-12 h-12 rounded-full bg-stone-950/70 hover:bg-stone-900/80 border border-amber-500/40 text-amber-300 font-bold text-xs shadow-lg flex flex-col items-center justify-center transition active:scale-95"
          >
            <span className="text-[14px]">ᚠ</span>
            <span className="text-[9px] uppercase">Rune</span>
          </button>

          {/* Jump Button */}
          <button
            onClick={onJump}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 border border-amber-300/60 text-stone-950 font-extrabold text-sm shadow-xl flex flex-col items-center justify-center transition active:scale-95"
          >
            <span className="text-[16px]">▲</span>
            <span className="text-[9px] uppercase font-bold">Jump</span>
          </button>
        </div>

        {/* Right Look Trackpad */}
        <div
          ref={rightPadRef}
          aria-label="Look Trackpad"
          className="w-32 h-24 sm:w-36 sm:h-28 rounded-2xl border border-amber-500/30 bg-stone-950/50 touch-none flex flex-col items-center justify-center text-amber-300/40 text-[10px] font-bold cursor-crosshair shadow-inner"
          onMouseDown={(e) => handleRightStart(e.clientX, e.clientY)}
          onMouseMove={(e) => handleRightMove(e.clientX, e.clientY)}
          onMouseUp={handleRightEnd}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            handleRightStart(touch.clientX, touch.clientY);
          }}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            handleRightMove(touch.clientX, touch.clientY);
          }}
          onTouchEnd={handleRightEnd}
        >
          <div className="flex items-center gap-1">
            <span>⇄</span>
            <span>DRAG TO LOOK</span>
            <span>⇅</span>
          </div>
        </div>
      </div>
    </div>
  );
};
