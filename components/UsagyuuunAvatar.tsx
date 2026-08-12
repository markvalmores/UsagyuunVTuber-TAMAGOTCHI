
import React from 'react';
import { UsagyuuunState } from '../types';

interface Props {
  state: UsagyuuunState;
}

const UsagyuuunAvatar: React.FC<Props> = ({ state }) => {
  const isJittering = state === UsagyuuunState.TALKING || state === UsagyuuunState.EXCITED;
  const isListening = state === UsagyuuunState.LISTENING;

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full select-none">
      {/* Dynamic Background Aura */}
      <div className={`absolute w-72 h-72 rounded-full blur-3xl transition-all duration-300 ${
        isJittering ? 'bg-pink-300 opacity-60 scale-125' : 
        isListening ? 'bg-blue-200 opacity-40 scale-100' : 'bg-pink-100 opacity-20 scale-90'
      }`} />

      {/* The Rabbit Body */}
      <div className={`relative transition-transform duration-75 ${isJittering ? 'animate-jitter' : ''} ${isListening ? 'scale-105' : 'scale-100'}`}>
        {/* Stars / Sparkles from reference image */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top Left Star (Pink) */}
          <div className="absolute -top-12 -left-8 animate-pulse">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="#FF8DA1">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </svg>
          </div>
          {/* Bottom Left Star (Yellow) */}
          <div className="absolute top-20 -left-16 animate-bounce" style={{ animationDelay: '0.2s' }}>
            <svg width="35" height="35" viewBox="0 0 24 24" fill="#FFD93D">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </svg>
          </div>
          {/* Top Right Star (Yellow) */}
          <div className="absolute -top-8 -right-12 animate-pulse" style={{ animationDelay: '0.5s' }}>
            <svg width="45" height="45" viewBox="0 0 24 24" fill="#FFD93D">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </svg>
          </div>
          {/* Bottom Right Star (Pink) */}
          <div className="absolute top-24 -right-16 animate-bounce" style={{ animationDelay: '0.7s' }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="#FF8DA1">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </svg>
          </div>
        </div>

        <svg
          viewBox="0 0 200 200"
          className="w-64 h-64 md:w-80 md:h-80 drop-shadow-2xl overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ears - Pointy as per reference */}
          <path d="M85 60 Q80 10 95 10 Q110 10 105 60" fill="white" stroke="black" strokeWidth="4" />
          <path d="M115 60 Q120 5 135 5 Q150 5 145 60" fill="white" stroke="black" strokeWidth="4" />
          
          {/* Head - Large Round */}
          <circle cx="115" cy="115" r="75" fill="white" stroke="black" strokeWidth="4" />
          
          {/* Eyes - Small dots */}
          <circle cx="95" cy="105" r="3.5" fill="black" />
          <circle cx="140" cy="110" r="3.5" fill="black" />
          
          {/* Nose - Tiny dot */}
          <circle cx="118" cy="115" r="1.5" fill="black" />

          {/* Cheeks - GIGANTIC pink circles */}
          <circle cx="75" cy="125" r="22" fill="#FFB7A1" opacity="1" />
          <circle cx="155" cy="130" r="22" fill="#FFB7A1" opacity="1" />

          {/* Mouth - Wide black triangle/shape as per image */}
          {state === UsagyuuunState.TALKING || state === UsagyuuunState.EXCITED || isListening ? (
             <path 
              d="M100 120 L135 125 L118 150 Z" 
              fill="black" 
              className={state === UsagyuuunState.TALKING ? "animate-pulse origin-center scale-y-110" : ""}
            />
          ) : (
            <path d="M105 125 L130 130" stroke="black" strokeWidth="3" strokeLinecap="round" />
          )}

          {/* Hands - Clapping/Held together position from image */}
          <g className={isJittering ? "animate-bounce" : ""}>
             <path d="M85 165 Q100 155 110 175" stroke="black" strokeWidth="4" strokeLinecap="round" fill="white" />
             <path d="M145 170 Q130 160 120 180" stroke="black" strokeWidth="4" strokeLinecap="round" fill="white" />
          </g>

          {/* Body/Arms simple lines */}
          <path d="M90 185 L85 200" stroke="black" strokeWidth="4" strokeLinecap="round" />
          <path d="M140 190 L145 200" stroke="black" strokeWidth="4" strokeLinecap="round" />
        </svg>

        {/* Floating Lightning/Effects (extra juice) */}
        {isJittering && (
           <div className="absolute top-0 right-0 flex flex-col gap-2 pointer-events-none">
              <span className="text-4xl animate-bounce">🥕</span>
              <span className="text-4xl animate-ping">💨</span>
           </div>
        )}
      </div>

      {/* Text Label */}
      <div className="mt-8 bg-white/90 backdrop-blur px-8 py-3 rounded-full border-4 border-pink-200 shadow-lg transform -rotate-1">
        <span className="text-2xl font-black text-pink-500 tracking-tighter uppercase">
          {state === UsagyuuunState.TALKING ? 'YABAYABAYABA!' : 
           state === UsagyuuunState.LISTENING ? 'KIIITERU!!' : 
           state === UsagyuuunState.EXCITED ? 'USAGYUUUN POWER!' : 'USAGYUUUN~'}
        </span>
      </div>
    </div>
  );
};

export default UsagyuuunAvatar;
