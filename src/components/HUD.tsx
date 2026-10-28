import React, { useState } from 'react';
import { WeatherType, WEATHER_PRESETS } from '../game/weather';
import { Landmark } from '../game/terrain';

interface HUDProps {
  stamina: number;
  speed: number;
  weather: WeatherType;
  activeRunes: number;
  totalRunes: number;
  landmarks: Landmark[];
  nearestLandmark: { name: string; distance: number; symbol: string } | null;
  playerPos: { x: number; y: number; z: number };
  isMuted: boolean;
  cameraMode: 'third' | 'first' | 'cinematic';
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onCycleWeather: () => void;
  onPause: () => void;
  showJoysticks: boolean;
  onToggleJoysticks: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  stamina,
  speed,
  weather,
  activeRunes,
  totalRunes,
  landmarks,
  nearestLandmark,
  playerPos,
  isMuted,
  cameraMode,
  onToggleMute,
  onToggleCamera,
  onCycleWeather,
  onPause,
  showJoysticks,
  onToggleJoysticks
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const weatherPreset = WEATHER_PRESETS[weather];

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* TOP BAR: Perimeter Clusters */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Solstice Rune Journal Tracker */}
        <div className="pointer-events-auto bg-stone-950/80 border border-amber-900/50 rounded-xl p-3 shadow-xl max-w-xs sm:max-w-sm">
          <div className="flex items-center justify-between gap-3 border-b border-amber-900/30 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-sm">✦</span>
              <span className="text-xs uppercase tracking-wider text-amber-200 font-bold">
                Solstice Runes
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-300 tabular-nums">
              {activeRunes} / {totalRunes}
            </span>
          </div>

          {/* 5 Rune Sockets */}
          <div className="grid grid-cols-5 gap-1.5">
            {landmarks.map((lm) => (
              <div
                key={lm.id}
                title={`${lm.name} (${lm.activated ? 'Awakened' : 'Dormant'})`}
                className={`flex flex-col items-center justify-center p-1.5 rounded border transition-all ${
                  lm.activated
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                    : 'bg-stone-900/60 border-stone-800 text-stone-500'
                }`}
              >
                <span className="text-base font-serif leading-none">{lm.runeSymbol}</span>
                <span className="text-[9px] uppercase tracking-tighter truncate max-w-[42px] mt-0.5">
                  {lm.name.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>

          {/* Nearest Landmark Radar Guide */}
          {nearestLandmark && (
            <div className="mt-2.5 pt-2 border-t border-amber-900/20 flex items-center justify-between text-[11px] text-amber-200/80">
              <span className="truncate pr-1">
                📍 {nearestLandmark.name}
              </span>
              <span className="font-mono text-amber-300 font-semibold tabular-nums shrink-0">
                {nearestLandmark.distance}m
              </span>
            </div>
          )}
        </div>

        {/* Top-Right: World Utility Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Weather Toggle */}
          <button
            onClick={onCycleWeather}
            title={`Current: ${weatherPreset.label} (Click to switch)`}
            className="px-3 py-2 bg-stone-950/80 hover:bg-stone-900 border border-amber-900/50 rounded-lg text-amber-300 text-xs font-semibold flex items-center gap-2 shadow-lg transition cursor-pointer active:scale-95"
          >
            <span>{weather === 'sunset' ? '🌅' : weather === 'rain' ? '🌧️' : weather === 'twilight' ? '🌌' : '☀️'}</span>
            <span className="hidden sm:inline">{weatherPreset.label}</span>
          </button>

          {/* Camera Mode */}
          <button
            onClick={onToggleCamera}
            title="Toggle 1st / 3rd Person View (V)"
            className="p-2 bg-stone-950/80 hover:bg-stone-900 border border-amber-900/50 rounded-lg text-amber-300 text-xs shadow-lg transition cursor-pointer active:scale-95"
          >
            {cameraMode === 'first' ? '👁️ 1st' : '🎥 3rd'}
          </button>

          {/* Joystick Toggle */}
          <button
            onClick={onToggleJoysticks}
            title="Toggle On-screen Joysticks"
            className={`p-2 border rounded-lg text-xs shadow-lg transition cursor-pointer active:scale-95 ${
              showJoysticks
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-stone-950/80 border-amber-900/50 text-stone-400'
            }`}
          >
            🕹️
          </button>

          {/* Audio Mute */}
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Unmute procedural audio' : 'Mute audio (M)'}
            className="p-2 bg-stone-950/80 hover:bg-stone-900 border border-amber-900/50 rounded-lg text-amber-300 text-xs shadow-lg transition cursor-pointer active:scale-95"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          {/* Pause */}
          <button
            onClick={onPause}
            title="Pause Game (Esc)"
            className="p-2 bg-stone-950/80 hover:bg-stone-900 border border-amber-900/50 rounded-lg text-amber-300 text-xs font-bold shadow-lg transition cursor-pointer active:scale-95"
          >
            ⏸️
          </button>
        </div>
      </div>

      {/* BOTTOM CENTER: Sleek Collapsible Dock */}
      <div className="pointer-events-auto mx-auto mb-2 flex flex-col items-center">
        {/* Collapse / Expand Toggle */}
        <button
          onClick={() => setIsDockCollapsed(!isDockCollapsed)}
          className="text-[10px] uppercase tracking-wider text-amber-300/80 bg-stone-950/70 border-t border-x border-amber-900/40 rounded-t px-3 py-1 hover:text-amber-200 transition cursor-pointer"
        >
          {isDockCollapsed ? '▴ Show Status Dock' : '▾ Hide Dock (H)'}
        </button>

        {!isDockCollapsed && (
          <div className="bg-stone-950/85 border border-amber-900/50 rounded-xl px-5 py-3 shadow-2xl flex flex-wrap items-center gap-6 max-w-xl text-stone-200">
            {/* Stamina Meter */}
            <div className="flex flex-col gap-1 min-w-[120px]">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold text-amber-300">
                <span>Stamina</span>
                <span className="tabular-nums font-mono">{stamina}%</span>
              </div>
              <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden border border-amber-900/30">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-75"
                  style={{ width: `${stamina}%` }}
                />
              </div>
            </div>

            {/* Speed Readout */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase tracking-wider text-amber-400/80 font-bold">Speed</span>
              <span className="text-lg font-mono font-bold text-amber-100 tabular-nums">
                {speed} <span className="text-xs font-normal text-stone-400">km/h</span>
              </span>
            </div>

            {/* Altitude / Coordinates */}
            <div className="flex flex-col items-center border-l border-amber-900/30 pl-4">
              <span className="text-[9px] uppercase tracking-wider text-amber-400/80 font-bold">Coords</span>
              <span className="text-xs font-mono text-stone-300 tabular-nums">
                {playerPos.x}, {playerPos.y}m, {playerPos.z}
              </span>
            </div>

            {/* Atmosphere Cue */}
            <div className="hidden sm:block text-[11px] text-amber-200/70 border-l border-amber-900/30 pl-4 max-w-[140px] truncate">
              {weatherPreset.ambientDescription}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
