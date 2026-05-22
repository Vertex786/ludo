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

const colorMap = {
  red: 'bg-red-500 border-red-700 placeholder:text-red-300',
  green: 'bg-green-500 border-green-700',
  yellow: 'bg-yellow-500 border-yellow-700',
  blue: 'bg-blue-500 border-blue-700'
};

const bgColors = {
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#eab308',
  blue: '#3b82f6',
}

export const Token: React.FC<TokenProps> = ({ color, x, y, isMine, canMove, diceValue, onClick, pos }) => {
  const isPlayable = isMine && canMove && pos !== 57 && (pos > 0 || (pos === 0 && diceValue === 6));

  const innerClass = isPlayable 
     ? 'shadow-[0_0_12px_rgba(255,255,255,1)] animate-bounce cursor-pointer border-white border-[3px] scale-110' 
     : 'border-slate-800 border-[3px] md:border-4';

  return (
    <motion.div
      initial={false}
      animate={{ 
         left: `${(x / 15) * 100}%`, 
         top: `${(y / 15) * 100}%` 
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      style={{
         width: `${(1 / 15) * 100}%`,
         height: `${(1 / 15) * 100}%`
      }}
      className={`absolute z-10 flex items-center justify-center p-0.5 md:p-1`}
      onClick={() => {
        if (isPlayable) onClick();
      }}
    >
      <div 
        className={`w-full h-full rounded-full transition-all flex items-center justify-center ${innerClass}`}
        style={{ backgroundColor: bgColors[color] }}
      >
         <div className="w-1/3 h-1/3 bg-white/40 rounded-full center" />
      </div>
    </motion.div>
  );
};
