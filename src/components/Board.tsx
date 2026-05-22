import React from 'react';
import { Player, PlayerColor } from '../types';
import { Token } from './Token';

type BoardProps = {
  players: Player[];
  onTokenClick: (tokenIndex: number) => void;
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

export const Board: React.FC<BoardProps> = ({ players, onTokenClick, myId, activeColor, diceRolled, diceValue }) => {
  const me = players.find(p => p.id === myId);
  const myTurn = me?.color === activeColor;

  const getTokenCoordinates = (color: PlayerColor, pos: number, tokenIdx: number) => {
    if (pos === 0) return BASE_POSITIONS[color][tokenIdx];
    if (pos >= 1 && pos <= 51) {
       let idx = (START_OFFSETS[color] + (pos - 1)) % 52;
       return MAIN_TRACK[idx];
    }
    if (pos >= 52 && pos <= 56) return HOME_STRAIGHTS[color][pos - 52];
    if (pos === 57) {
      const hx = 7, hy = 7;
      if (color === 'red') return { x: hx - 0.5, y: hy };
      if (color === 'green') return { x: hx, y: hy - 0.5 };
      if (color === 'yellow') return { x: hx + 0.5, y: hy };
      if (color === 'blue') return { x: hx, y: hy + 0.5 };
    }
    return { x: 0, y: 0 };
  }

  const BASE_BG_CLASSES = { red: 'bg-red-500', green: 'bg-green-500', yellow: 'bg-yellow-500', blue: 'bg-blue-500' };

  const renderBase = (col: number, row: number, color: PlayerColor) => (
    <div 
      className={`absolute ${BASE_BG_CLASSES[color]} flex items-center justify-center p-[5%]`}
      style={{
        left: `${(col / 15) * 100}%`,
        top: `${(row / 15) * 100}%`,
        width: `${(6 / 15) * 100}%`,
        height: `${(6 / 15) * 100}%`,
      }}
    >
        <div className="w-full h-full bg-white rounded-lg md:rounded-xl shadow-inner flex flex-wrap gap-[15%] items-center justify-center p-[15%]">
             <div className="w-[35%] h-[35%] rounded-full border border-slate-300 bg-slate-100 flex items-center justify-center"><div className={`w-1/2 h-1/2 rounded-full ${BASE_BG_CLASSES[color]} opacity-20`}></div></div>
             <div className="w-[35%] h-[35%] rounded-full border border-slate-300 bg-slate-100 flex items-center justify-center"><div className={`w-1/2 h-1/2 rounded-full ${BASE_BG_CLASSES[color]} opacity-20`}></div></div>
             <div className="w-[35%] h-[35%] rounded-full border border-slate-300 bg-slate-100 flex items-center justify-center"><div className={`w-1/2 h-1/2 rounded-full ${BASE_BG_CLASSES[color]} opacity-20`}></div></div>
             <div className="w-[35%] h-[35%] rounded-full border border-slate-300 bg-slate-100 flex items-center justify-center"><div className={`w-1/2 h-1/2 rounded-full ${BASE_BG_CLASSES[color]} opacity-20`}></div></div>
        </div>
    </div>
  );

  const cells = [];
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      let isPath = false;
      let pathColor = 'bg-white';
      
      const isCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;

      if (
        (r === 7 && c >= 1 && c <= 5) || 
        (c === 1 && r === 6)
      ) {
        pathColor = 'bg-red-400';
        isPath = true;
      } else if (
        (c === 7 && r >= 1 && r <= 5) || 
        (c === 8 && r === 1)
      ) {
        pathColor = 'bg-green-400';
        isPath = true;
      } else if (
        (r === 7 && c >= 9 && c <= 13) ||
        (c === 13 && r === 8)
      ) {
        pathColor = 'bg-yellow-400';
        isPath = true;
      } else if (
        (c === 7 && r >= 9 && r <= 13) ||
        (c === 6 && r === 13)
      ) {
         pathColor = 'bg-blue-400';
         isPath = true;
      } else if (
         (r >= 6 && r <= 8) || (c >= 6 && c <= 8)
      ) {
         isPath = true;
      }

      const isBaseArea = (r < 6 && c < 6) || (r < 6 && c > 8) || (r > 8 && c < 6) || (r > 8 && c > 8);

      if (isBaseArea) {
          // Empty div keeps grid structure but renders no lines
          cells.push(<div key={`${c}-${r}`} style={{ gridColumn: c + 1, gridRow: r + 1 }}></div>);
          continue;
      }

      let innerContent = null;
      const starPositions = [
        {c: 2, r: 6}, {c: 6, r: 2}, {c: 8, r: 1}, {c: 12, r: 6}, 
        {c: 13, r: 8}, {c: 8, r: 12}, {c: 6, r: 13}, {c: 2, r: 8}
      ];
      if (starPositions.some(s => s.c === c && s.r === r)) {
          innerContent = <div className="text-gray-400 text-[10px] md:text-sm">★</div>;
      }

      if (isCenter) {
         if (r===7 && c===7) pathColor="bg-slate-800";
         else if (r===6 && c===7) pathColor = "bg-green-500";
         else if (r===7 && c===8) pathColor = "bg-yellow-500";
         else if (r===8 && c===7) pathColor = "bg-blue-500";
         else if (r===7 && c===6) pathColor = "bg-red-500";
         else pathColor = "bg-slate-100";
      }

      cells.push(
        <div 
          key={`${c}-${r}`} 
          className={`w-full h-full border-[0.5px] border-slate-300 box-border flex items-center justify-center ${pathColor}`}
          style={{ gridColumn: c + 1, gridRow: r + 1 }}
        >
           {innerContent}
        </div>
      );
    }
  }

  return (
    <div className="relative w-full h-full bg-white shadow-xl rounded-xl overflow-hidden border-[4px] md:border-[6px] border-slate-800">
      <div 
        className="w-full h-full grid relative"
        style={{ gridTemplateColumns: 'repeat(15, 1fr)', gridTemplateRows: 'repeat(15, 1fr)' }}
      >
        {cells}

        {renderBase(0, 0, 'red')}
        {renderBase(9, 0, 'green')}
        {renderBase(9, 9, 'yellow')}
        {renderBase(0, 9, 'blue')}

        {players.map(player => 
          player.tokens.map((pos, idx) => {
            const coords = getTokenCoordinates(player.color, pos, idx);
            return (
              <Token
                key={`${player.id}-${idx}`}
                color={player.color}
                x={coords.x}
                y={coords.y}
                isMine={me?.id === player.id}
                canMove={myTurn && diceRolled}
                diceValue={diceValue}
                onClick={() => { if (myTurn && diceRolled && me?.id === player.id) onTokenClick(idx) }}
                pos={pos}
              />
            )
          })
        )}
      </div>
    </div>
  );
};
