import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { PlayerColor } from '../types';
import { getTokenCoordinates } from './Board';

interface TokenProps {
  color: PlayerColor;
  tokenIdx: number;
  isMine: boolean;
  canMove: boolean;
  diceValue: number | null;
  onClick: () => void;
  pos: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

const bgColors = {
  red: '#e11d48',
  green: '#16a34a',
  yellow: '#eab308',
  blue: '#0ea5e9',
}

const darkColors = {
  red: '#881337',
  green: '#14532d',
  yellow: '#854d0e',
  blue: '#0c4a6e',
}

const TokenPinSVG = ({ color }: { color: string }) => (
  <svg viewBox="0 0 40 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
    <path d="M20 2C9.5 2 1 10.5 1 21C1 36 20 54 20 54C20 54 39 36 39 21C39 10.5 30.5 2 20 2Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1"/>
    <path d="M20 5C11.16 5 4 12.16 4 21C4 32.5 20 45 20 45C20 45 36 32.5 36 21C36 12.16 28.84 5 20 5Z" fill="#ffffff" />
    <circle cx="20" cy="20" r="10" fill={color} stroke="#000000" strokeWidth="1" strokeOpacity="0.2"/>
    <circle cx="17" cy="17" r="4" fill="#ffffff" opacity="0.6"/>
  </svg>
);

const GearRing = ({ color, darkColor }: { color: string, darkColor: string }) => {
  return (
    <svg viewBox="0 0 100 100" className="absolute top-1/2 left-1/2 -ml-[90%] -mt-[90%] w-[180%] h-[180%] animate-[spin_4s_linear_infinite] drop-shadow-lg z-10 origin-center pointer-events-none">
      <g fill={darkColor}>
        <circle cx="50" cy="50" r="32" />
        {[0, 45, 90, 135].map(rot => (
          <rect key={rot} x="41" y="10" width="18" height="80" rx="3" transform={`rotate(${rot} 50 50)`} />
        ))}
      </g>
      <circle cx="50" cy="50" r="24" fill="white" />
      <circle cx="50" cy="50" r="16" fill={color} />
      <circle cx="50" cy="50" r="8" fill={darkColor} />
    </svg>
  )
}

export const Token: React.FC<TokenProps> = ({ color, tokenIdx, isMine, canMove, diceValue, onClick, pos, scale, offsetX, offsetY }) => {
  const isPlayable = isMine && canMove && pos !== 57 && (
    (pos === 0 && diceValue === 6) ||
    (pos > 0 && diceValue !== null && pos + diceValue <= 57)
  );
  const controls = useAnimation();
  const [prevPos, setPrevPos] = useState(pos);

  useEffect(() => {
     const animateHop = async () => {
        if (pos > prevPos && pos - prevPos <= 6 && prevPos > 0 && pos !== 57) { 
            for(let i = prevPos + 1; i <= pos; i++) {
                const c = getTokenCoordinates(color, i, tokenIdx);
                 if (i === pos) {
                   await controls.start({ left: `${(c.x + offsetX)/15*100}%`, top: `${(c.y + offsetY)/15*100}%`, scale, transition: { duration: 0.12, ease: "linear" } });
                } else {
                   await controls.start({ left: `${c.x/15*100}%`, top: `${c.y/15*100}%`, scale: 1, transition: { duration: 0.12, ease: "linear" } });
                }
            }
        } else {
            const c = getTokenCoordinates(color, pos, tokenIdx);
            controls.start({ left: `${(c.x + offsetX)/15*100}%`, top: `${(c.y + offsetY)/15*100}%`, scale, transition: { duration: 0.2, ease: "easeOut" } });
        }
        setPrevPos(pos);
     };

     if (pos !== prevPos) {
         animateHop();
     } else {
         const c = getTokenCoordinates(color, pos, tokenIdx);
         controls.start({ left: `${(c.x + offsetX)/15*100}%`, top: `${(c.y + offsetY)/15*100}%`, scale, transition: { duration: 0.2, ease: "easeInOut" } });
     }
  }, [pos, offsetX, offsetY, scale, color, tokenIdx, controls, prevPos]);

  const pulseClass = isPlayable ? 'cursor-pointer z-30' : 'z-10';

  return (
    <motion.div
      initial={false}
      animate={controls}
      style={{
         width: `${(1 / 15) * 100}%`,
         height: `${(1 / 15) * 100}%`,
      }}
      className={`absolute flex items-center justify-center ${pulseClass}`}
      onClick={(e) => {
        if (isPlayable) {
           e.stopPropagation();
           onClick();
        }
      }}
    >
      <div className={`w-full h-full relative transition-transform ${isPlayable ? 'hover:scale-110' : ''}`}>
         {/* Super clear base indicator ring perfectly centered on the cell */}
         <div className={`absolute top-1/2 left-1/2 -ml-[35%] -mt-[35%] w-[70%] aspect-square rounded-full border-[3px] shadow-sm pointer-events-none ${isPlayable ? 'border-yellow-400 animate-pulse bg-white/20' : 'border-slate-800/20 bg-black/10'}`} style={{ transform: 'rotateX(55deg)' }} />
         
         {isPlayable && <GearRing color={bgColors[color]} darkColor={darkColors[color]} />}
         
         {/* Pin Marker - mathematically perfect alignment so the bottom tip (y=54 in a 56h viewBox) is exactly at the cell's center */ }
         <div 
            className="absolute z-20 pointer-events-none"
            style={{
               width: '85%',
               aspectRatio: '40 / 56',
               left: '50%',
               top: '50%',
               transform: 'translate(-50%, -96.4%)'
            }}
         >
             <TokenPinSVG color={bgColors[color]} />
         </div>
      </div>
    </motion.div>
  );
};
