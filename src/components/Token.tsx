import React from 'react';
import { motion } from 'framer-motion';
import { PlayerColor } from '../types';

interface TokenProps {
  color: PlayerColor;
  x: number;
  y: number;
  isMine: boolean;
  canMove: boolean;
  diceValue: number | null;
  onClick: () => void;
  pos: number;
}

const bgColors = {
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#eab308',
  blue: '#3b82f6',
}

export const Token: React.FC<TokenProps> = ({ color, x, y, isMine, canMove, diceValue, onClick, pos }) => {
  const isPlayable = isMine && canMove && pos !== 57 && (pos > 0 || (pos === 0 && diceValue === 6));

  const innerClass = isPlayable 
     ? 'shadow-[0_0_15px_rgba(255,255,255,1)] animate-pulse cursor-pointer border-white border-[2px] md:border-[3px] scale-110' 
     : 'border-slate-800 border-[2px] md:border-[3px]';

  return (
    <motion.div
      initial={false}
      animate={{ 
         left: `${(x / 15) * 100}%`, 
         top: `${(y / 15) * 100}%` 
      }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      style={{
         width: `${(1 / 15) * 100}%`,
         height: `${(1 / 15) * 100}%`
      }}
      className={`absolute flex items-center justify-center p-[2px] md:p-1 ${isPlayable ? 'z-30' : 'z-10'}`}
      onClick={() => {
        if (isPlayable) onClick();
      }}
    >
      <div 
        className={`w-full h-full rounded-full transition-all flex items-center justify-center relative ${innerClass}`}
        style={{ backgroundColor: bgColors[color] }}
      >
         <div className="w-1/3 h-1/3 bg-white/40 rounded-full" />
         {isPlayable && pos === 0 && (
            <div className="absolute -top-3 -right-3 text-[10px] bg-slate-900 text-white font-bold px-1 rounded shadow-md animate-bounce border border-slate-700 whitespace-nowrap">
               MOVE!
            </div>
         )}
      </div>
    </motion.div>
  );
};
