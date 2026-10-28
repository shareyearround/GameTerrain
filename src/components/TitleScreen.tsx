import React, { useEffect } from 'react';

interface TitleScreenProps {
  onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]);

  return (
    <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-8 sm:p-12 z-20 select-none">
      {/* Top Left: Bespoke SVG Title Lockup over negative space */}
      <div className="max-w-xl pointer-events-auto mt-4 sm:mt-8">
        <div className="flex items-center gap-3 mb-2">
          {/* Ancient Solstice Crest Icon */}
          <svg className="w-10 h-10 text-amber-400 drop-shadow-md" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
            <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="1.5" />
            <path d="M24 4V10M24 38V44M4 24H10M38 24H44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M10 10L14 14M34 34L38 38M10 38L14 34M34 14L38 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="24" cy="24" r="5" fill="#f59e0b" />
          </svg>
          <span className="text-amber-200 tracking-widest text-xs uppercase font-semibold">
            Solo 3D Open World Adventure
          </span>
        </div>

        {/* Bespoke Title SVG Text Lockup */}
        <h1 className="text-4xl sm:text-6xl font-serif tracking-wider font-extrabold text-amber-100 drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)]">
          AETHELGARD
        </h1>
        <p className="text-lg sm:text-xl font-medium text-amber-200/90 tracking-wide mt-1 drop-shadow-md">
          The Sunset Realm
        </p>

        <p className="text-sm text-amber-100/70 mt-4 leading-relaxed max-w-md drop-shadow">
          Journey across rolling golden highlands, sacred water sanctuaries, and ancient monoliths.
          Awaken the 5 Solstice Runes while observing wild elk herds and soaring raptors bathed in eternal god rays.
        </p>

        {/* Start Game CTA */}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            data-start="true"
            onClick={onStart}
            className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-bold rounded-lg shadow-lg shadow-amber-900/40 transform active:scale-95 transition cursor-pointer flex items-center gap-3 tracking-wide"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span>START ADVENTURE</span>
          </button>

          <span className="text-xs text-amber-200/75 bg-stone-900/60 border border-amber-600/30 px-3 py-2 rounded">
            Press <kbd className="font-mono text-amber-300 font-bold">Space</kbd> or <kbd className="font-mono text-amber-300 font-bold">Enter</kbd>
          </span>
        </div>
      </div>

      {/* Bottom Safe Margin: Flat Single-Line Control Hint */}
      <div className="pointer-events-auto bg-stone-950/70 border border-amber-900/40 rounded-lg px-4 py-2.5 max-w-2xl text-xs text-stone-300/90 flex flex-wrap items-center justify-between gap-2 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-semibold">CONTROLS:</span>
          <span>WASD Move · Shift Sprint · Space Jump · V Camera · E Interact · Esc Pause</span>
        </div>
        <div className="text-amber-400/80 text-[11px]">
          Virtual Joysticks enabled for touch & mouse
        </div>
      </div>
    </div>
  );
};
