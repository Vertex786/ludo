import express from "express";
import http from "http";
import path from "path";
import { Server as SocketIOServer } from "socket.io";
import { createServer as createViteServer } from "vite";
import { v4 as uuidv4 } from "uuid";

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;

// -- Ludo Game Logic State --
export type PlayerColor = "red" | "green" | "yellow" | "blue";
export const ALL_COLORS: PlayerColor[] = ["red", "green", "yellow", "blue"];

export interface Player {
  id: string; // Socket ID or persisted ID
  color: PlayerColor;
  tokens: number[]; // 4 tokens, values 0-57 (0 = in base, 1-51 = path, 52-56 = home straight, 57 = home)
  hasFinished: boolean;
  latestMessage?: string; // Ephemeral chat message
  avatarColor?: string; // custom avatar color/seed
}

export interface Room {
  id: string;
  name: string;
  maxPlayers: number;
  players: Player[];
  activeColor: PlayerColor;
  diceValue: number | null;
  diceRolled: boolean;
  gameState: "waiting" | "playing" | "finished";
  sixCount: number; // to handle 3 sixes = pass turn
  turnTimeout?: NodeJS.Timeout;
  turnEndTime?: number;
}

const rooms = new Map<string, Room>();

// Ephemeral room messages clear timers
const playerMessageTimers = new Map<string, NodeJS.Timeout>();

function passTurn(room: Room) {
  const currentIdx = ALL_COLORS.indexOf(room.activeColor);
  let nextIdx = (currentIdx + 1) % 4;
  
  // Find next active player
  let loopCount = 0;
  while (loopCount < 4) {
    const nextPlayer = room.players.find(p => p.color === ALL_COLORS[nextIdx]);
    if (nextPlayer && !nextPlayer.hasFinished) {
      break;
    }
    nextIdx = (nextIdx + 1) % 4;
    loopCount++;
  }
  
  room.activeColor = ALL_COLORS[nextIdx];
  room.diceValue = null;
  room.diceRolled = false;
  room.sixCount = 0;
  room.turnEndTime = Date.now() + 30000;
}

io.on("connection", (socket) => {
  socket.on("createRoom", (data: { maxPlayers: number }, callback) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms.set(roomId, {
      id: roomId,
      name: `Room ${roomId}`,
      maxPlayers: data.maxPlayers || 4,
      players: [],
      activeColor: "red",
      diceValue: null,
      diceRolled: false,
      gameState: "waiting",
      sixCount: 0
    });
    callback({ roomId });
  });

  socket.on("joinRoom", (data: { roomId: string, playerId: string }, callback) => {
    const room = rooms.get(data.roomId);
    if (!room) return callback({ error: "Room not found" });

    let player = room.players.find(p => p.id === data.playerId);
    
    if (!player) {
      if (room.players.length >= room.maxPlayers && room.gameState !== "waiting") {
         return callback({ error: "Room is full or game started" });
      }
      // Assign next available color prioritizing diagonals for 2 players
      let colorsToAssign = ALL_COLORS.slice(0, room.maxPlayers);
      if (room.maxPlayers === 2) colorsToAssign = ["red", "yellow"];
      if (room.maxPlayers === 3) colorsToAssign = ["red", "green", "blue"];
      
      const usedColors = room.players.map(p => p.color);
      const nextColor = colorsToAssign.find(c => !usedColors.includes(c));
      
      if (!nextColor) return callback({ error: "Room full" });

      player = {
        id: data.playerId,
        color: nextColor,
        tokens: [0, 0, 0, 0],
        hasFinished: false
      };
      room.players.push(player);
    }
    
    socket.join(room.id);
    // If we have enough players to start, auto-start
    if (room.gameState === "waiting" && room.players.length >= 2 && room.players.length === room.maxPlayers) {
      room.gameState = "playing";
      // Determine active player (the first entered color)
      room.activeColor = room.players[0].color;
      room.turnEndTime = Date.now() + 30000;
    }

    io.to(room.id).emit("roomState", room);
    callback({ success: true, playerColor: player.color, maxPlayers: room.maxPlayers });
  });

  socket.on("rollDice", (data: { roomId: string, playerId: string }) => {
    const room = rooms.get(data.roomId);
    if (!room || room.gameState !== "playing") return;
    
    const player = room.players.find(p => p.id === data.playerId);
    if (!player || player.color !== room.activeColor) return;
    if (room.diceRolled) return;

    const dice = Math.floor(Math.random() * 6) + 1;
    // const dice = 6; // for testing
    room.diceValue = dice;
    room.diceRolled = true;
    room.turnEndTime = Date.now() + 30000;

    if (dice === 6) {
      room.sixCount += 1;
      if (room.sixCount === 3) {
        // Punish: pass turn automatically on 3rd 6 (optional rule, let's keep it simple and just pass)
        passTurn(room);
        io.to(room.id).emit("roomState", room);
        return;
      }
    } else {
      room.sixCount = 0;
    }

    // Check if player has any valid moves
    const hasMove = player.tokens.some((pos, idx) => {
      if (pos === 0 && dice === 6) return true; // Can get out
      if (pos > 0 && pos + dice <= 57) return true; // Can move
      return false;
    });

    if (!hasMove) {
       // Auto pass turn if no possible moves
       setTimeout(() => {
         const r = rooms.get(data.roomId);
         if(r && r.diceRolled && r.activeColor === player.color && r.diceValue === dice) {
            passTurn(r);
            io.to(r.id).emit("roomState", r);
         }
       }, 1000);
    }

    io.to(room.id).emit("roomState", room);
  });

  socket.on("moveToken", (data: { roomId: string, playerId: string, tokenIndex: number }) => {
    const room = rooms.get(data.roomId);
    if (!room || room.gameState !== "playing" || !room.diceRolled) return;
    
    const player = room.players.find(p => p.id === data.playerId);
    if (!player || player.color !== room.activeColor) return;

    const tokenPos = player.tokens[data.tokenIndex];
    const dice = room.diceValue!;
    let moved = false;
    let extraTurn = false;

    if (tokenPos === 0 && dice === 6) {
      player.tokens[data.tokenIndex] = 1; // start pos
      moved = true;
      extraTurn = true; // wait, rolling 6 already gives extra turn via not passing
    } else if (tokenPos > 0 && tokenPos + dice <= 57) {
      const targetPos = tokenPos + dice;
      player.tokens[data.tokenIndex] = targetPos;
      moved = true;
      
      if (targetPos === 57) {
        extraTurn = true; // Reach home gets bonus turn
      }
      
      // Collision logic for cutting other players
      // Real ludo needs global coordinate mapping to check if spots overlap
      // For simplicity, we must map `targetPos` (1-51) onto a 52-length circular array based on color offsets.
      // 0-12 (Red to just before Green)
      // 13-25 (Green to Yellow)
      // 26-38 (Yellow to Blue)
      // 39-51 (Blue to Red)
      if (targetPos <= 51) {
        const starPositions = [1, 9, 14, 22, 27, 35, 40, 48]; // standard safe zones
        const absolutePos = getAbsolutePosition(player.color, targetPos);
        let isSafeSpot = starPositions.some(p => getAbsolutePosition("red", p) === absolutePos); // Check against global relative
        let cutSomeone = false;

        if (!isSafeSpot) {
          // Check collision
          for (let other of room.players) {
            if (other.id !== player.id) {
              for (let i = 0; i < 4; i++) {
                const otherPos = other.tokens[i];
                if (otherPos > 0 && otherPos <= 51) {
                  const outAbsolute = getAbsolutePosition(other.color, otherPos);
                  if (absolutePos === outAbsolute) {
                    other.tokens[i] = 0; // Cut! Sending home
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

    if (moved) {
      // Check win condition
      if (player.tokens.every(t => t === 57)) {
        player.hasFinished = true;
      }
      
      // End game logic and turn passing
      const activePlayersCount = room.players.filter(p => !p.hasFinished).length;
      if (activePlayersCount <= 1 && room.players.length > 1) {
        room.gameState = "finished";
      } else {
        if (extraTurn || dice === 6) {
          room.diceRolled = false;
          room.diceValue = null;
          room.turnEndTime = Date.now() + 30000;
        } else {
          passTurn(room);
        }
      }
      io.to(room.id).emit("roomState", room);
    }
  });

  socket.on("chatMessage", (data: { roomId: string, playerId: string, message: string }) => {
    const room = rooms.get(data.roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === data.playerId);
    if (!player) return;

    player.latestMessage = data.message.substring(0, 50); // limit somewhat
    io.to(room.id).emit("chatUpdate", { playerId: data.playerId, message: player.latestMessage });

    // Clear previous timer if any
    const timerKey = `${room.id}_${player.id}`;
    if (playerMessageTimers.has(timerKey)) {
      clearTimeout(playerMessageTimers.get(timerKey)!);
    }
    
    // Set timer to clear ephemeral message after 5 seconds
    const timer = setTimeout(() => {
        const currentRoom = rooms.get(data.roomId);
        if (currentRoom) {
            const p = currentRoom.players.find(pl => pl.id === data.playerId);
            if (p) {
                p.latestMessage = undefined;
                io.to(room.id).emit("chatUpdate", { playerId: data.playerId, message: null });
            }
        }
        playerMessageTimers.delete(timerKey);
    }, 5000);
    playerMessageTimers.set(timerKey, timer);
  });

  socket.on("startNewGame", (data: { roomId: string }) => {
    const room = Object.assign({}, rooms.get(data.roomId));
    if (room) {
      // Broad cast to everyone to go home
      io.to(data.roomId).emit("gameReset");
      // Actually wipe data
      rooms.delete(data.roomId);
    }
  });

});

// Absolute position calculation (0 to 51 main track)
// Red starts at 1, which acts as absolute 0 (for ease of calculation).
// Actually Let's map it so Red Start = 0 absolute.
const START_OFFSETS = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39
};

function getAbsolutePosition(color: PlayerColor, pathPos: number): number {
    if (pathPos === 0 || pathPos > 51) return -1; // Not in main track
    // pathPos is 1 to 51
    return (START_OFFSETS[color] + (pathPos - 1)) % 52;
}

setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (room.gameState === "playing" && room.turnEndTime && now >= room.turnEndTime) {
       passTurn(room);
       io.to(roomId).emit("roomState", room);
    }
  }
}, 1000);

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
