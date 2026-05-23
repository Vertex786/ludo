import React from 'react';
import { Player, PlayerColor } from '../types';
import { Token } from './Token';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from 'lucide-react';

const DiceIcon = ({ val, className }: { val: number | null, className?: string }) => {
    switch (val) {
        case 1: return <Dice1 className={className} />;
        case 2: return <Dice2 className={className} />;
        case 3: return <Dice3 className={className} />;
        case 4: return <Dice4 className={className} />;
        case 5: return <Dice5 className={className} />;
        case 6: return <Dice6 className={className} />;
        default: return <Dice5 className={className} />;
    }
};

type BoardProps = {
  players: Player[];
  onTokenClick: (tokenIndex: number) => void;
  rollDice: () => void;
  myId: string;
  activeColor: PlayerColor;
  diceRolled: boolean;
  diceValue: number | null;
};

// Map each 1..51 relative position to an x,y on the 15x15 grid.
const MAIN_TRACK = [
  // Red start to corner
  { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 },
  // Go up towards top left
  { x: 6, y: 5 }, { x: 6, y: 4 }, { x: 6, y: 3 }, { x: 6, y: 2 }, { x: 6, y: 1 }, { x: 6, y: 0 },
  // Top horizontal
  { x: 7, y: 0 }, { x: 8, y: 0 },
  // Go down towards green base
  { x: 8, y: 1 }, { x: 8, y: 2 }, { x: 8, y: 3 }, { x: 8, y: 4 }, { x: 8, y: 5 },
  // Go right
  { x: 9, y: 6 }, { x: 10, y: 6 }, { x: 11, y: 6 }, { x: 12, y: 6 }, { x: 13, y: 6 }, { x: 14, y: 6 },
  // Right vertical
  { x: 14, y: 7 }, { x: 14, y: 8 },
  // Go left towards yellow base
  { x: 13, y: 8 }, { x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }, { x: 9, y: 8 },
  // Go down
  { x: 8, y: 9 }, { x: 8, y: 10 }, { x: 8, y: 11 }, { x: 8, y: 12 }, { x: 8, y: 13 }, { x: 8, y: 14 },
  // Bottom horizontal
  { x: 7, y: 14 }, { x: 6, y: 14 },
  // Go up towards blue base
  { x: 6, y: 13 }, { x: 6, y: 12 }, { x: 6, y: 11 }, { x: 6, y: 10 }, { x: 6, y: 9 },
  // Go left
  { x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 }, { x: 2, y: 8 }, { x: 1, y: 8 }, { x: 0, y: 8 },
  // Left vertical
  { x: 0, y: 7 }, { x: 0, y: 6 } 
];

const HOME_STRAIGHTS = {
  red: [ { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 } ],
  green: [ { x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 } ],
  yellow: [ { x: 13, y: 7 }, { x: 12, y: 7 }, { x: 11, y: 7 }, { x: 10, y: 7 }, { x: 9, y: 7 } ],
  blue: [ { x: 7, y: 13 }, { x: 7, y: 12 }, { x: 7, y: 11 }, { x: 7, y: 10 }, { x: 7, y: 9 } ]
};

const BASE_POSITIONS = {
  red: [ { x: 1.5, y: 1.5 }, { x: 3.5, y: 1.5 }, { x: 1.5, y: 3.5 }, { x: 3.5, y: 3.5 } ],
  green: [ { x: 10.5, y: 1.5 }, { x: 12.5, y: 1.5 }, { x: 10.5, y: 3.5 }, { x: 12.5, y: 3.5 } ],
  yellow: [ { x: 10.5, y: 10.5 }, { x: 12.5, y: 10.5 }, { x: 10.5, y: 12.5 }, { x: 12.5, y: 12.5 } ],
  blue: [ { x: 1.5, y: 10.5 }, { x: 3.5, y: 10.5 }, { x: 1.5, y: 12.5 }, { x: 3.5, y: 12.5 } ]
};

const START_OFFSETS = { red: 0, green: 13, yellow: 26, blue: 39 };

export const getTokenCoordinates = (color: PlayerColor, pos: number, tokenIdx: number) => {
  if (pos === 0) return BASE_POSITIONS[color][tokenIdx];
  if (pos >= 1 && pos <= 51) {
     let idx = (START_OFFSETS[color] + (pos - 1)) % 52;
     return MAIN_TRACK[idx];
  }
  if (pos >= 52 && pos <= 56) return HOME_STRAIGHTS[color][pos - 52];
  if (pos === 57) {
    const hx = 7, hy = 7;
    if (color === 'red') return { x: hx - 0.7, y: hy };
    if (color === 'green') return { x: hx, y: hy - 0.7 };
    if (color === 'yellow') return { x: hx + 0.7, y: hy };
    if (color === 'blue') return { x: hx, y: hy + 0.7 };
  }
  return { x: 7, y: 7 };
}

export const Board: React.FC<BoardProps> = ({ players, onTokenClick, myId, activeColor, diceRolled, diceValue }) => {
  const me = players.find(p => p.id === myId);
  const myTurn = me?.color === activeColor;

  const renderBase = (col: number, row: number, color: PlayerColor) => {
    const bgClasses = { red: 'bg-red-600', green: 'bg-green-600', yellow: 'bg-[#d2a316]', blue: 'bg-sky-500' };
    const darkClasses = { red: 'bg-red-900', green: 'bg-green-900', yellow: 'bg-yellow-800', blue: 'bg-sky-800' };
    return (
      <div 
        key={`base-${color}`}
        className={`absolute ${bgClasses[color]} border border-black/20`}
        style={{
          left: `${(col / 15) * 100}%`,
          top: `${(row / 15) * 100}%`,
          width: `${(6 / 15) * 100}%`,
          height: `${(6 / 15) * 100}%`,
        }}
      >
          <div className="absolute top-[15%] left-[15%] w-[70%] h-[70%] bg-white rounded-xl shadow border border-black/20 flex">
               <div className={`w-[30%] h-[30%] absolute top-[12%] left-[12%] rounded-full ${darkClasses[color]} shadow-inner flex items-center justify-center`}>
                   <div className={`w-2/3 h-2/3 rounded-full ${bgClasses[color]}`}></div>
               </div>
               <div className={`w-[30%] h-[30%] absolute top-[12%] right-[12%] rounded-full ${darkClasses[color]} shadow-inner flex items-center justify-center`}>
                   <div className={`w-2/3 h-2/3 rounded-full ${bgClasses[color]}`}></div>
               </div>
               <div className={`w-[30%] h-[30%] absolute bottom-[12%] left-[12%] rounded-full ${darkClasses[color]} shadow-inner flex items-center justify-center`}>
                   <div className={`w-2/3 h-2/3 rounded-full ${bgClasses[color]}`}></div>
               </div>
               <div className={`w-[30%] h-[30%] absolute bottom-[12%] right-[12%] rounded-full ${darkClasses[color]} shadow-inner flex items-center justify-center`}>
                   <div className={`w-2/3 h-2/3 rounded-full ${bgClasses[color]}`}></div>
               </div>
          </div>
      </div>
    );
  };

  const starSVG = (
    <svg viewBox="0 0 24 24" fill="transparent" stroke="#1e293b" strokeWidth="1.5" className="w-[60%] h-[60%] opacity-70">
      <path strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  );

  const cells = [];
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const isBaseArea = (r < 6 && c < 6) || (r < 6 && c > 8) || (r > 8 && c < 6) || (r > 8 && c > 8);
      const isCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;

      if (isBaseArea || isCenter) {
          continue; // Drawn separately
      }

      let isPath = false;
      let pathColor = 'bg-white';
      const bgClasses = { red: 'bg-red-600', green: 'bg-green-600', yellow: 'bg-[#d2a316]', blue: 'bg-sky-500' };
      
      // Starting positions (colored arrow squares)
      if (c === 1 && r === 6) pathColor = bgClasses['red'];
      else if (c === 8 && r === 1) pathColor = bgClasses['green'];
      else if (c === 13 && r === 8) pathColor = bgClasses['yellow'];
      else if (c === 6 && r === 13) pathColor = bgClasses['blue'];
      // Home straights
      else if (r === 7 && c >= 1 && c <= 5) pathColor = bgClasses['red'];
      else if (c === 7 && r >= 1 && r <= 5) pathColor = bgClasses['green'];
      else if (r === 7 && c >= 9 && c <= 13) pathColor = bgClasses['yellow'];
      else if (c === 7 && r >= 9 && r <= 13) pathColor = bgClasses['blue'];

      let innerContent = null;
      const starPositions = [
        {c: 6, r: 2}, {c: 12, r: 6}, {c: 8, r: 12}, {c: 2, r: 8}
      ];
      if (starPositions.some(s => s.c === c && s.r === r)) {
          innerContent = starSVG;
      }
      
      // Draw arrows on the empty adjacent entry cells
      if (c === 0 && r === 6) innerContent = <div className="text-red-600 font-bold text-lg md:text-xl leading-none mt-[-2px]">→</div>;
      if (c === 8 && r === 0) innerContent = <div className="text-green-600 font-bold text-lg md:text-xl leading-none mt-[-2px]">↓</div>;
      if (c === 14 && r === 8) innerContent = <div className="text-yellow-600 font-bold text-lg md:text-xl leading-none mt-[-2px]">←</div>;
      if (c === 6 && r === 14) innerContent = <div className="text-sky-500 font-bold text-lg md:text-xl leading-none mt-[-2px]">↑</div>;

      cells.push(
        <div 
          key={`${c}-${r}`} 
          className={`absolute border-[0.5px] border-slate-300/80 box-border flex items-center justify-center ${pathColor}`}
          style={{ width: `${100/15}%`, height: `${100/15}%`, left: `${(c/15)*100}%`, top: `${(r/15)*100}%` }}
        >
           {innerContent}
        </div>
      );
    }
  }

  const centerTriangle = (
    <div className="absolute z-0 block border border-black/10" style={{ left: '40%', top: '40%', width: '20%', height: '20%' }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
        <polygon points="0,0 50,50 0,100" fill="#dc2626" stroke="#000" strokeWidth="0.5"/>
        <polygon points="0,0 100,0 50,50" fill="#16a34a" stroke="#000" strokeWidth="0.5"/>
        <polygon points="100,0 100,100 50,50" fill="#d2a316" stroke="#000" strokeWidth="0.5"/>
        <polygon points="0,100 100,100 50,50" fill="#0ea5e9" stroke="#000" strokeWidth="0.5"/>
      </svg>
    </div>
  );

  return (
    <div className="relative w-full h-full bg-white shadow-xl rounded-md overflow-hidden border-[10px] md:border-[16px] border-[#222]">
      <div className="w-full h-full relative border-2 border-black/10">
        
        {/* Draw safe paths */}
        {cells}

        {/* Draw bases */}
        {renderBase(0, 0, 'red')}
        {renderBase(9, 0, 'green')}
        {renderBase(9, 9, 'yellow')}
        {renderBase(0, 9, 'blue')}

        {/* Draw Center Home */}
        {centerTriangle}

        {/* Draw tokens */}
        {(() => {
          // Pre-calculate positions and groups for overlaps
          const tokensList = players.flatMap(player => 
             player.tokens.map((pos, idx) => ({
                id: player.id,
                color: player.color,
                tokenIdx: idx,
                pos,
                rawCoords: getTokenCoordinates(player.color, pos, idx)
             }))
          );
          
          const getCellKey = (x: number, y: number) => `${Math.round(x*10)}_${Math.round(y*10)}`;
          const cellGroups: Record<string, typeof tokensList> = {};
          
          tokensList.forEach(t => {
             if (t.pos > 0) { // Group only track and home tokens
                const key = getCellKey(t.rawCoords.x, t.rawCoords.y);
                if (!cellGroups[key]) cellGroups[key] = [];
                cellGroups[key].push(t);
             }
          });

          return tokensList.map(t => {
             let scale = 1;
             let offsetX = 0;
             let offsetY = 0;

             if (t.pos > 0) {
                 const key = getCellKey(t.rawCoords.x, t.rawCoords.y);
                 const group = cellGroups[key];
                 const count = group.length;
                 const idxInGroup = group.findIndex(gt => gt.id === t.id && gt.tokenIdx === t.tokenIdx);
                 
                 if (count === 2) {
                     scale = 0.75;
                     offsetX = idxInGroup === 0 ? -0.2 : 0.2;
                 } else if (count === 3) {
                     scale = 0.65;
                     if (idxInGroup === 0) { offsetX = -0.2; offsetY = 0.15; }
                     else if (idxInGroup === 1) { offsetX = 0.2; offsetY = 0.15; }
                     else { offsetX = 0; offsetY = -0.2; }
                 } else if (count > 3) {
                     scale = 0.55;
                     const r = Math.floor(idxInGroup / 2);
                     const c = idxInGroup % 2;
                     offsetX = (c === 0 ? -0.2 : 0.2) + (idxInGroup > 3 ? (idxInGroup*0.05) : 0);
                     offsetY = (r === 0 ? -0.2 : 0.2) + (idxInGroup > 3 ? (idxInGroup*0.05) : 0);
                 }
             }

             return (
                <Token
                  key={`${t.id}-${t.tokenIdx}`}
                  color={t.color}
                  tokenIdx={t.tokenIdx}
                  isMine={me?.id === t.id}
                  canMove={!!myTurn && !!diceRolled}
                  diceValue={diceValue}
                  onClick={() => { if (myTurn && diceRolled && me?.id === t.id) onTokenClick(t.tokenIdx) }}
                  pos={t.pos}
                  scale={scale}
                  offsetX={offsetX}
                  offsetY={offsetY}
                />
             );
          });
        })()}
      </div>
    </div>
  );
};

