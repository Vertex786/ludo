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
  red: '#ff0000',
  green: '#00b050',
  yellow: '#ffff00',
  blue: '#0070c0',
}

const TokenPinSVG = ({ color }: { color: string }) => (
  <svg viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
    <path d="M12 0C5.373 0 0 5.373 0 12C0 21 12 36 12 36C12 36 24 21 24 12C24 5.373 18.627 0 12 0Z" fill={color} stroke="#1e293b" strokeWidth="1.5" strokeLinejoin="round"/>
    <circle cx="12" cy="11" r="4.5" fill="white" />
    <circle cx="12" cy="11" r="2.5" fill={color} opacity={0.6} />
  </svg>
);

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
            // Hop on normal path
            for(let i = prevPos + 1; i <= pos; i++) {
                const c = getTokenCoordinates(color, i, tokenIdx);
                if (i === pos) {
                   await controls.start({ left: `${(c.x + offsetX)/15*100}%`, top: `${(c.y + offsetY)/15*100}%`, scale, transition: { duration: 0.2, type: "tween" } });
                } else {
                   await controls.start({ left: `${c.x/15*100}%`, top: `${c.y/15*100}%`, scale: 1, transition: { duration: 0.2, type: "tween" } });
                }
            }
        } else {
            // Cut or out of base or directly to 57 -> jump
            const c = getTokenCoordinates(color, pos, tokenIdx);
            controls.start({ left: `${(c.x + offsetX)/15*100}%`, top: `${(c.y + offsetY)/15*100}%`, scale, transition: { duration: 0.3 } });
        }
        setPrevPos(pos);
     };

     if (pos !== prevPos) {
         animateHop();
     } else {
         const c = getTokenCoordinates(color, pos, tokenIdx);
         // Just structural update due to token clustering
         controls.start({ left: `${(c.x + offsetX)/15*100}%`, top: `${(c.y + offsetY)/15*100}%`, scale, transition: { duration: 0.25 } });
     }
  }, [pos, offsetX, offsetY, scale, color, tokenIdx, controls, prevPos]);

  const pulseClass = isPlayable 
     ? 'drop-shadow-[0_0_8px_rgba(255,255,255,1)] cursor-pointer z-30' 
     : 'z-10';

  let pathColorCSS = '';
  if (color === 'red') pathColorCSS = 'border-red-400';
  if (color === 'green') pathColorCSS = 'border-green-400';
  if (color === 'yellow') pathColorCSS = 'border-yellow-400';
  if (color === 'blue') pathColorCSS = 'border-blue-400';

  return (
    <motion.div
      initial={false}
      animate={controls}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      style={{
         width: `${(1 / 15) * 100}%`,
         height: `${(1.3 / 15) * 100}%`,
         transform: 'translate(0%, -25%)'
      }}
      className={`absolute flex items-end justify-center ${pulseClass}`}
      onClick={() => {
        if (isPlayable) onClick();
      }}
    >
      <div className="w-[85%] h-full relative flex items-end justify-center transition-transform hover:scale-110">
         {/* Ring System when playable */}
         {isPlayable && (
             <div className={`absolute bottom-[0%] w-[150%] aspect-square rounded-full border-[3px] border-dashed ${pathColorCSS} animate-[spin_3s_linear_infinite] opacity-60 pointer-events-none origin-center transform-gpu`} style={{ zIndex: -1 }} />
         )}
         
         <TokenPinSVG color={bgColors[color]} />
         {isPlayable && pos === 0 && (
            <div className="absolute -top-4 text-[16px] text-white animate-bounce drop-shadow-md">
               👇
            </div>
         )}
      </div>
    </motion.div>
  );
};
