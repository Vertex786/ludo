import { Room, PlayerColor, Player } from '../types';

export const ALL_COLORS: PlayerColor[] = ["red", "green", "yellow", "blue"];

const START_OFFSETS = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39
};

export function getAbsolutePosition(color: PlayerColor, pathPos: number): number {
    if (pathPos === 0 || pathPos > 51) return -1;
    return (START_OFFSETS[color] + (pathPos - 1)) % 52;
}

export function passTurn(room: Room): Room {
  const currentIdx = ALL_COLORS.indexOf(room.activeColor);
  let nextIdx = (currentIdx + 1) % 4;
  
  let loopCount = 0;
  while (loopCount < 4) {
    const nextPlayer = room.players.find(p => p.color === ALL_COLORS[nextIdx]);
    if (nextPlayer && !nextPlayer.hasFinished) {
      break;
    }
    nextIdx = (nextIdx + 1) % 4;
    loopCount++;
  }
  
  return {
      ...room,
      activeColor: ALL_COLORS[nextIdx],
      diceValue: null,
      diceRolled: false,
      sixCount: 0,
      turnEndTime: Date.now() + 2000000
  };
}

export function rollDiceLocal(room: Room, myId: string): Room {
  if (room.gameState !== "playing") return room;
  const player = room.players.find(p => p.id === myId);
  if (!player || player.color !== room.activeColor || room.diceRolled) return room;

  const dice = Math.floor(Math.random() * 6) + 1;
  let newRoom = { ...room, diceValue: dice, diceRolled: true, turnEndTime: Date.now() + 2000000 };

  if (dice === 6) {
    newRoom.sixCount += 1;
    if (newRoom.sixCount === 3) {
      return passTurn(newRoom);
    }
  } else {
    newRoom.sixCount = 0;
  }

  const hasMove = player.tokens.some((pos, idx) => {
    if (pos === 0 && dice === 6) return true;
    if (pos > 0 && pos + dice <= 57) return true;
    return false;
  });

  if (!hasMove) {
      return passTurn(newRoom);
  }

  return newRoom;
}

export function moveTokenLocal(room: Room, myId: string, tokenIndex: number): Room {
    if (room.gameState !== "playing" || !room.diceRolled || !room.diceValue) return room;
    
    let players = JSON.parse(JSON.stringify(room.players)) as Player[];
    const playerIndex = players.findIndex(p => p.id === myId);
    if (playerIndex === -1 || players[playerIndex].color !== room.activeColor) return room;

    const player = players[playerIndex];
    const tokenPos = player.tokens[tokenIndex];
    const dice = room.diceValue;
    let moved = false;
    let extraTurn = false;

    if (tokenPos === 0 && dice === 6) {
      player.tokens[tokenIndex] = 1;
      moved = true;
      extraTurn = true;
    } else if (tokenPos > 0 && tokenPos + dice <= 57) {
      const targetPos = tokenPos + dice;
      player.tokens[tokenIndex] = targetPos;
      moved = true;
      
      if (targetPos === 57) {
        extraTurn = true;
      }
      
      if (targetPos <= 51) {
        const starPositions = [1, 9, 14, 22, 27, 35, 40, 48];
        const absolutePos = getAbsolutePosition(player.color, targetPos);
        let isSafeSpot = starPositions.some(p => getAbsolutePosition("red", p) === absolutePos);
        let cutSomeone = false;

        if (!isSafeSpot) {
          for (let other of players) {
            if (other.id !== player.id) {
              for (let i = 0; i < 4; i++) {
                const otherPos = other.tokens[i];
                if (otherPos > 0 && otherPos <= 51) {
                  const outAbsolute = getAbsolutePosition(other.color, otherPos);
                  if (absolutePos === outAbsolute) {
                    other.tokens[i] = 0; // Cut!
                    cutSomeone = true;
                  }
                }
              }
            }
          }
        }
        if (cutSomeone) extraTurn = true;
      }
    }

    if (!moved) return room;

    if (player.tokens.every(t => t === 57)) {
      player.hasFinished = true;
    }

    let newRoom = { ...room, players };
    
    const activePlayersCount = players.filter(p => !p.hasFinished).length;
    if (activePlayersCount <= 1 && players.length > 1) {
      newRoom.gameState = "finished";
    } else {
      if (extraTurn || dice === 6) {
        newRoom.diceRolled = false;
        newRoom.diceValue = null;
        newRoom.turnEndTime = Date.now() + 2000000;
      } else {
        newRoom = passTurn(newRoom);
      }
    }

    return newRoom;
}
