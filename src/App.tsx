import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { Board } from './components/Board';
import { Room, PlayerColor } from './types';
import { Copy, PlusSquare, Dice5, SendHorizontal, RefreshCcw } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_APP_URL || window.location.origin;

const colorMapClasses = {
  red: 'bg-red-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  blue: 'bg-blue-500'
};

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [myId, setMyId] = useState<string>('');
  const [myColor, setMyColor] = useState<PlayerColor | null>(null);
  
  const [playerCountSelect, setPlayerCountSelect] = useState<number>(4);
  const [chatInput, setChatInput] = useState('');
  const [timerProgress, setTimerProgress] = useState<number>(100);

  useEffect(() => {
    if (!room?.turnEndTime || room.gameState !== 'playing') {
      setTimerProgress(100);
      return;
    }
    
    let req: number;
    const updateTimer = () => {
        const now = Date.now();
        const left = Math.max(0, room.turnEndTime! - now);
        const pct = (left / 20000) * 100;
        setTimerProgress(pct);
        if (left > 0) req = requestAnimationFrame(updateTimer);
    };
    req = requestAnimationFrame(updateTimer);
    return () => cancelAnimationFrame(req);
  }, [room?.turnEndTime, room?.gameState]);
  
  useEffect(() => {
    let savedId = localStorage.getItem('ludoPlayerId');
    if (!savedId) {
      savedId = uuidv4();
      localStorage.setItem('ludoPlayerId', savedId);
    }
    setMyId(savedId);

    const match = window.location.search.match(/room=([A-Z0-9]+)/);
    if (match) setRoomId(match[1]);
  }, []);

  useEffect(() => {
    if (!myId) return;

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      if (roomId) {
        newSocket.emit('joinRoom', { roomId, playerId: myId }, (res: any) => {
          if (res.error) {
            alert(res.error);
            window.location.search = '';
          } else {
            setMyColor(res.playerColor);
          }
        });
      }
    });

    newSocket.on('roomState', (state: Room) => {
      setRoom(state);
    });

    newSocket.on('chatUpdate', (data: { playerId: string, message: string | null }) => {
       setRoom(prev => {
         if (!prev) return null;
         const players = prev.players.map(p => 
           p.id === data.playerId ? { ...p, latestMessage: data.message || undefined } : p
         );
         return { ...prev, players };
       });
    });

    newSocket.on('gameReset', () => {
        setRoomId(null);
        setRoom(null);
        window.history.replaceState({}, document.title, window.location.pathname);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [myId, roomId]);

  const createGame = () => {
    if (!socket) return;
    socket.emit('createRoom', { maxPlayers: playerCountSelect }, (res: any) => {
      window.history.pushState({}, '', `?room=${res.roomId}`);
      setRoomId(res.roomId);
      socket.emit('joinRoom', { roomId: res.roomId, playerId: myId }, (joinRes: any) => {
        setMyColor(joinRes.playerColor);
      });
    });
  };

  const rollDice = () => {
    if (!socket || !room) return;
    socket.emit('rollDice', { roomId: room.id, playerId: myId });
  };

  const moveToken = (tokenIndex: number) => {
    if (!socket || !room) return;
    socket.emit('moveToken', { roomId: room.id, playerId: myId, tokenIndex });
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !room || !chatInput.trim()) return;
    socket.emit('chatMessage', { roomId: room.id, playerId: myId, message: chatInput });
    setChatInput('');
  };

  const startNewGame = () => {
      if(!socket || !room) return;
      if(window.confirm("End this game and start a new one? All data will be removed immediately.")) {
          socket.emit('startNewGame', {roomId: room.id});
      }
  }

  if (!roomId || !room) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden text-center space-y-6">
          <div className="bg-red-500 p-8 text-white">
             <h1 className="text-4xl font-black tracking-tight mb-2">সংকেত Ludo</h1>
             <p className="text-red-100 font-medium">Real-time Multiplayer</p>
          </div>
          
          <div className="p-8 space-y-8">
              {!roomId ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-800">Create New Game</h2>
                  <div className="flex justify-center gap-4">
                    {[2, 3, 4].map(num => (
                      <button
                        key={num}
                        onClick={() => setPlayerCountSelect(num)}
                        className={`w-16 h-16 rounded-xl border-2 text-xl font-bold flex items-center justify-center transition-all ${playerCountSelect === num ? 'border-red-500 bg-red-50 text-red-600' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={createGame}
                    className="w-full py-4 mt-6 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                  >
                    <PlusSquare className="w-5 h-5" /> Start Game
                  </button>
                </div>
              ) : (
                <div className="animate-pulse space-y-4">
                   <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                   <p className="text-slate-500">Connecting to Room {roomId}...</p>
                </div>
              )}
          </div>
        </div>
      </div>
    );
  }

  const myTurn = room.activeColor === myColor;

  return (
    <div className="fixed inset-0 bg-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Header - Minimal Branding */}
      <header className="bg-white border-b border-slate-200 px-3 py-1.5 flex items-center justify-between shrink-0 shadow-sm z-20 h-12">
        <div className="flex items-center gap-2">
           <div className="bg-[#ff0000] rounded px-2 py-0.5 flex items-center justify-center text-white font-black text-sm tracking-widest leading-none drop-shadow-sm">সংকেত</div>
        </div>
        
        <div className="flex gap-2">
          {room.gameState === 'waiting' && (
             <button 
               onClick={() => navigator.clipboard.writeText(window.location.href)}
               className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md hover:bg-blue-100 font-bold border border-blue-100"
             >
                <Copy className="w-4 h-4" /> <span className="hidden sm:inline">Invite ({room.players.length}/{room.maxPlayers})</span>
             </button>
          )}

          <button 
             onClick={startNewGame}
             className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-md hover:bg-slate-200 font-bold"
          >
             <RefreshCcw className="w-4 h-4" /> <span className="hidden sm:inline">Restart</span>
          </button>
        </div>
      </header>

      {/* Main Board Area - Flex 1 */}
      <main className="flex-1 min-h-0 flex flex-col items-center justify-center relative p-2 md:p-4 gap-3">
         
         <div className="relative w-full h-full max-h-[100vmin] max-w-[100vmin] flex items-center justify-center shrink">
             {/* Ephemeral Chat Bubbles */}
             {room.players.map(p => {
               if (!p.latestMessage) return null;
               
               let posClasses = '';
               if (p.color === 'red') posClasses = 'top-4 left-4';
               if (p.color === 'green') posClasses = 'top-4 right-4';
               if (p.color === 'yellow') posClasses = 'bottom-4 right-4';
               if (p.color === 'blue') posClasses = 'bottom-4 left-4';
               
               return (
                 <div key={`chat-${p.id}`} className={`absolute z-50 ${posClasses} pointer-events-none transition-all`}>
                    <div className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded-xl shadow-xl max-w-[120px] truncate animate-in zoom-in">
                       {p.latestMessage}
                    </div>
                 </div>
               )
             })}
             
             <Board 
               players={room.players} 
               onTokenClick={moveToken} 
               myId={myId}
               activeColor={room.activeColor}
               diceRolled={room.diceRolled}
               diceValue={room.diceValue}
             />
         </div>

         {/* Compact Controls Area */}
         {room.gameState === 'playing' && (
           <div className="shrink-0 w-full max-w-[400px] bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col overflow-hidden">
             {/* Timer Progress Bar */}
             <div className="w-full h-1 bg-slate-100">
                <div 
                  className={`h-full ${colorMapClasses[room.activeColor]} transition-none`} 
                  style={{ width: `${timerProgress}%` }}
                />
             </div>
             
             <div className="h-14 flex items-center px-3 justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${colorMapClasses[room.activeColor]} shadow-inner ${myTurn ? 'animate-pulse scale-125' : ''}`}></div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">Turn</span>
                      <span className="text-xs font-black capitalize text-slate-800 leading-none mt-1">{room.activeColor}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 flex items-center justify-center relative">
                      {room.diceValue ? (
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-900 border border-slate-700 text-white rounded-[4px] md:rounded-lg flex items-center justify-center text-lg md:text-xl font-black shadow drop-shadow-md animate-in zoom-in">
                           {room.diceValue}
                        </div>
                      ) : (
                        <Dice5 className={`w-6 h-6 md:w-8 md:h-8 text-slate-300 ${myTurn ? 'animate-bounce text-slate-400' : ''}`} />
                      )}
                    </div>

                    {myTurn ? (
                      <button 
                        onClick={rollDice}
                        disabled={room.diceRolled}
                        className={`w-20 h-8 md:w-24 md:h-9 rounded font-bold text-xs flex items-center justify-center transition-all ${!room.diceRolled ? `${colorMapClasses[myColor!]} text-white shadow hover:scale-105 active:scale-95` : 'bg-slate-100 text-slate-400'}`}
                      >
                        {room.diceRolled ? 'MOVE' : 'ROLL'}
                      </button>
                    ) : (
                      <div className="w-20 h-8 md:w-24 md:h-9 text-[10px] text-slate-400 font-bold flex items-center justify-center bg-slate-50 rounded">Waiting</div>
                    )}
                </div>
             </div>
           </div>
         )}
         
         {room.gameState === 'finished' && (
             <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-30 flex items-center justify-center">
                 <div className="bg-white p-6 rounded-2xl shadow-2xl text-center max-w-xs w-full animate-in zoom-in">
                    <h2 className="text-3xl font-black text-slate-800 mb-2">Game Over!</h2>
                    <p className="text-sm text-slate-500 mb-6">Return to lobby to play again</p>
                    <button onClick={startNewGame} className="w-full py-3 bg-red-500 text-white font-bold rounded-xl shadow-md">New Game</button>
                 </div>
             </div>
         )}
      </main>

      {/* compact chat */}
      <footer className="bg-white border-t border-slate-200 p-1.5 shrink-0 shadow-sm z-50 h-14 relative">
         <form onSubmit={sendChat} className="flex gap-2 max-w-[400px] mx-auto h-full">
            <input 
              type="text" 
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Type message..."
              className="flex-1 bg-slate-100 border-none outline-none focus:ring-1 focus:ring-slate-300 rounded-md px-3 py-1 text-slate-800 text-[16px]"
              maxLength={40}
            />
            <button 
              type="submit"
              disabled={!chatInput.trim()}
              className="bg-slate-900 text-white w-12 h-full rounded-md flex items-center justify-center shrink-0 disabled:opacity-50 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <SendHorizontal className="w-5 h-5 pointer-events-none" />
            </button>
         </form>
      </footer>
    </div>
  );
}
