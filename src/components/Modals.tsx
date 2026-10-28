import React from 'react';
import { WeatherType, WEATHER_PRESETS } from '../game/weather';
import { Landmark } from '../game/terrain';

// 1. Pause Modal
interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
  currentWeather: WeatherType;
  onSelectWeather: (type: WeatherType) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onTitle,
  currentWeather,
  onSelectWeather,
  isMuted,
  onToggleMute
}) => {
  const weatherOptions: WeatherType[] = ['sunset', 'midday', 'rain', 'twilight'];

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-stone-950/75 select-none">
      <div className="bg-stone-900 border-2 border-amber-600/60 rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-stone-200">
        <div className="flex items-center justify-between border-b border-amber-900/40 pb-3 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-lg">⏸️</span>
            <h2 className="text-xl font-serif font-bold text-amber-100 tracking-wide">
              ADVENTURE PAUSED
            </h2>
          </div>
          <button
            onClick={onToggleMute}
            className="p-1.5 bg-stone-800 hover:bg-stone-700 rounded border border-amber-800/40 text-amber-300 text-sm"
          >
            {isMuted ? '🔇 Muted' : '🔊 Audio On'}
          </button>
        </div>

        {/* Dynamic Weather System Picker */}
        <div className="mb-6">
          <label className="text-xs uppercase tracking-wider text-amber-400 font-bold block mb-2">
            Dynamic Weather System
          </label>
          <div className="grid grid-cols-2 gap-2">
            {weatherOptions.map((type) => {
              const preset = WEATHER_PRESETS[type];
              const isSelected = currentWeather === type;
              return (
                <button
                  key={type}
                  onClick={() => onSelectWeather(type)}
                  className={`p-2.5 rounded-lg border text-xs font-semibold text-left transition flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-stone-800/60 border-stone-700 text-stone-400 hover:bg-stone-800'
                  }`}
                >
                  <span>{type === 'sunset' ? '🌅' : type === 'rain' ? '🌧️' : type === 'twilight' ? '🌌' : '☀️'}</span>
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls Quick Ref */}
        <div className="mb-6 bg-stone-950/60 border border-stone-800 rounded-lg p-3 text-xs text-stone-300">
          <div className="text-[10px] uppercase font-bold text-amber-400/80 mb-1">Controls Guide</div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <div><span className="font-semibold text-amber-200">WASD / Stick:</span> Move</div>
            <div><span className="font-semibold text-amber-200">Shift / Button:</span> Sprint</div>
            <div><span className="font-semibold text-amber-200">Space / ▲:</span> Jump</div>
            <div><span className="font-semibold text-amber-200">E / Rune:</span> Activate</div>
            <div><span className="font-semibold text-amber-200">Mouse Drag / Pad:</span> Look</div>
            <div><span className="font-semibold text-amber-200">V:</span> 1st/3rd View</div>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-bold rounded-lg shadow-lg transform active:scale-95 transition cursor-pointer"
          >
            RESUME JOURNEY
          </button>
          <div className="flex gap-2">
            <button
              onClick={onRestart}
              className="flex-1 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg text-xs font-semibold text-stone-300 transition cursor-pointer"
            >
              Respawn at Valley
            </button>
            <button
              onClick={onTitle}
              className="flex-1 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg text-xs font-semibold text-stone-300 transition cursor-pointer"
            >
              Main Title
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. Victory Modal (When all 5 Solstice Runes are awakened)
interface VictoryModalProps {
  onContinue: () => void;
  onRestart: () => void;
  runTimeSeconds: number;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  onContinue,
  onRestart,
  runTimeSeconds
}) => {
  const minutes = Math.floor(runTimeSeconds / 60);
  const seconds = Math.floor(runTimeSeconds % 60);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-stone-950/80 select-none">
      <div className="bg-stone-900 border-2 border-amber-500 rounded-2xl max-w-lg w-full p-8 shadow-[0_0_40px_rgba(245,158,11,0.3)] text-stone-200 text-center">
        {/* Emblem */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-3xl text-amber-300 shadow-lg">
          ✦
        </div>

        <h2 className="text-3xl font-serif font-extrabold text-amber-100 tracking-wider mb-2">
          SOLSTICE AWAKENED
        </h2>
        <p className="text-sm text-amber-200/80 max-w-sm mx-auto mb-6">
          All 5 ancient Solstice Runes shine in unison. The eternal golden god rays bathe the realm of Aethelgard in peace.
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6 bg-stone-950/70 border border-amber-900/40 rounded-xl p-4">
          <div>
            <div className="text-[10px] uppercase font-bold text-amber-400/80">Runes Awakened</div>
            <div className="text-2xl font-mono font-bold text-amber-200 tabular-nums">5 / 5</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-amber-400/80">Exploration Time</div>
            <div className="text-2xl font-mono font-bold text-amber-200 tabular-nums">
              {minutes}m {seconds.toString().padStart(2, '0')}s
            </div>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col gap-3">
          <button
            data-start="true"
            onClick={onContinue}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-bold rounded-lg shadow-lg transform active:scale-95 transition cursor-pointer"
          >
            CONTINUE FREE-ROAM EXPLORATION
          </button>
          <button
            onClick={onRestart}
            className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg text-xs font-semibold text-stone-300 transition cursor-pointer"
          >
            Restart Adventure From Beginning
          </button>
        </div>
      </div>
    </div>
  );
};

// 3. Discovery Toast
interface DiscoveryToastProps {
  landmark: Landmark;
  totalActivated: number;
}

export const DiscoveryToast: React.FC<DiscoveryToastProps> = ({ landmark, totalActivated }) => {
  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none transition-all duration-300 animate-bounce">
      <div className="bg-stone-950/90 border-2 border-amber-400 rounded-xl px-6 py-3 shadow-2xl flex items-center gap-4 text-stone-100">
        <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-xl text-amber-300 font-serif">
          {landmark.runeSymbol}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">
            Rune Awakened ({totalActivated}/5)
          </div>
          <div className="text-base font-serif font-bold text-amber-100">
            {landmark.name}
          </div>
          <div className="text-xs text-amber-200/80 max-w-xs truncate">
            {landmark.description}
          </div>
        </div>
      </div>
    </div>
  );
};
