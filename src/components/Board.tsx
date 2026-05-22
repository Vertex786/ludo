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
// Let Red start be (x:1, y:6) using 0-indexed coords.
// Let's manually map the 52 path cells in order starting from Red's start.
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
  { x: 0, y: 7 }, { x: 0, y: 6 } // -> connects back to x:1, y:6
];

// Home straights
const HOME_STRAIGHTS = {
  red: [ { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 } ],
  green: [ { x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 } ],
  yellow: [ { x: 13, y: 7 }, { x: 12, y: 7 }, { x: 11, y: 7 }, { x: 10, y: 7 }, { x: 9, y: 7 } ],
  blue: [ { x: 7, y: 13 }, { x: 7, y: 12 }, { x: 7, y: 11 }, { x: 7, y: 10 }, { x: 7, y: 9 } ]
};

// Base positions
const BASE_POSITIONS = {
  red: [ { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 } ],
  green: [ { x: 11, y: 2 }, { x: 12, y: 2 }, { x: 11, y: 3 }, { x: 12, y: 3 } ],
  yellow: [ { x: 11, y: 11 }, { x: 12, y: 11 }, { x: 11, y: 12 }, { x: 12, y: 12 } ],
  blue: [ { x: 2, y: 11 }, { x: 3, y: 11 }, { x: 2, y: 12 }, { x: 3, y: 12 } ]
};

// Offset mapping to sync with the server logic offset
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
      // Small offset in the home triangle so they don't overlap totally
      const hx = 7, hy = 7;
      if (color === 'red') return { x: hx - 0.5, y: hy };
      if (color === 'green') return { x: hx, y: hy - 0.5 };
      if (color === 'yellow') return { x: hx + 0.5, y: hy };
      if (color === 'blue') return { x: hx, y: hy + 0.5 };
    }
    return { x: 0, y: 0 };
  }

  // Draw exactly what the grid dictates
  const cells = [];
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      let isPath = false;
      let pathColor = 'bg-white border-gray-200';
      if (
        (r === 7 && c >= 1 && c <= 5) || 
        (c === 1 && r === 6)
      ) {
        pathColor = 'bg-red-400 border-red-500';
        isPath = true;
      } else if (
        (c === 7 && r >= 1 && r <= 5) || 
        (c === 8 && r === 1)
      ) {
        pathColor = 'bg-green-400 border-green-500';
        isPath = true;
      } else if (
        (r === 7 && c >= 9 && c <= 13) ||
        (c === 13 && r === 8)
      ) {
        pathColor = 'bg-yellow-400 border-yellow-500';
        isPath = true;
      } else if (
        (c === 7 && r >= 9 && r <= 13) ||
        (c === 6 && r === 13)
      ) {
         pathColor = 'bg-blue-400 border-blue-500';
         isPath = true;
      } else if (
         // Just basic outline for main path to distinguish from empty zones
         (r >= 6 && r <= 8) || (c >= 6 && c <= 8)
      ) {
         isPath = true;
      }

      // Safe stars (approx)
      let isStar = false;
      const starPositions = [
        {c: 2, r: 6}, {c: 6, r: 2}, {c: 8, r: 1}, {c: 12, r: 6}, 
        {c: 13, r: 8}, {c: 8, r: 12}, {c: 6, r: 13}, {c: 2, r: 8}
      ];
      if (starPositions.some(s => s.c === c && s.r === r)) isStar = true;

      // Base rendering (pure large div instead of lots of cells)
      // Actually CSS Grid is 15x15 so we just render cells.
      if (!isPath && !((r>=6&&r<=8) || (c>=6&&c<=8))) {
        pathColor = 'bg-transparent';
      }

      // If it's center home
      if (r >= 6 && r <= 8 && c >= 6 && c <= 8) {
         if (r===7 && c===7) pathColor="bg-gray-800"; // center point
         else if (r===6 || r===8 || c===6 || c===8) {
            // triangles... maybe just solid colors for simplicity
            if(r===7 && c===6) pathColor = "bg-red-500";
            else if(r===6 && c===7) pathColor = "bg-green-500";
            else if(r===7 && c===8) pathColor = "bg-yellow-500";
            else if(r===8 && c===7) pathColor = "bg-blue-500";
         }
      }

      cells.push(
        <div 
          key={`${c}-${r}`} 
          className={`w-full h-full border box-border flex items-center justify-center ${pathColor}`}
          style={{ gridColumn: c + 1, gridRow: r + 1 }}
        >
           {isStar && <div className="text-gray-300 text-[10px]">★</div>}
        </div>
      );
    }
  }

  const BASE_BORDER_CLASSES = { red: 'border-red-500', green: 'border-green-500', yellow: 'border-yellow-500', blue: 'border-blue-500' };
  const BASE_BG_CLASSES = { red: 'bg-red-50', green: 'bg-green-50', yellow: 'bg-yellow-50', blue: 'bg-blue-50' };

  // Base boxes as overlays over the grid
  const renderBase = (col: number, row: number, color: PlayerColor) => (
    <div 
      className={`absolute border-[12px] md:border-[16px] ${BASE_BORDER_CLASSES[color]} bg-white shadow-xl rounded-2xl flex items-center justify-center`}
      style={{
        left: `${(col / 15) * 100}%`,
        top: `${(row / 15) * 100}%`,
        width: `${(6 / 15) * 100}%`,
        height: `${(6 / 15) * 100}%`,
      }}
    >
        <div className={`w-3/4 h-3/4 ${BASE_BG_CLASSES[color]} flex flex-wrap gap-2 items-center justify-center rounded-xl p-2 md:p-3`}>
             {/* Note the circles are actual tokens now! */}
        </div>
    </div>
  );

  return (
    <div className="relative w-full max-w-[500px] aspect-square mx-auto bg-white shadow-2xl rounded-lg overflow-hidden border-4 border-slate-900 border-opacity-10 p-0.5 md:p-1">
      {/* Grid */}
      <div 
        className="w-full h-full grid relative"
        style={{ gridTemplateColumns: 'repeat(15, 1fr)', gridTemplateRows: 'repeat(15, 1fr)' }}
      >
        {cells}

        {/* Bases */}
        {renderBase(0, 0, 'red')}
        {renderBase(9, 0, 'green')}
        {renderBase(9, 9, 'yellow')}
        {renderBase(0, 9, 'blue')}

        {/* Tokens */}
        {players.map(player => 
          player.tokens.map((pos, idx) => {
            const coords = getTokenCoordinates(player.color, pos, idx);
            // Count overlaps to offset
            let overlapCount = 0;
            // A bit complex without full mapping, let's keep simple overlap offsets
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
