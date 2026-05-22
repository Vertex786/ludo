import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { Board } from './components/Board';
import { Room, PlayerColor } from './types';
import { Copy, PlusSquare, Dice5, SendHorizontal, Home, LogOut, RefreshCcw } from 'lucide-react';

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
  
  // UI states
  const [playerCountSelect, setPlayerCountSelect] = useState<number>(4);
  const [chatInput, setChatInput] = useState('');
  
  // Load or create player ID
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
        // Auto join
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
        // Server wiped game, go back
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
      if(window.confirm("Are you sure? This will delete the current game for everyone.")) {
          socket.emit('startNewGame', {roomId: room.id});
      }
  }

  // --- RENDERING ---

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
    <div className="fixed inset-0 bg-slate-50 flex flex-col font-sans">
      {/* Header - Minimal Branding */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center text-white font-black text-sm">সং</div>
           <h1 className="font-bold text-slate-800 hidden sm:block tracking-tight text-lg">সংকেত Ludo</h1>
        </div>
        
        {room.gameState === 'waiting' && (
           <button 
             onClick={() => navigator.clipboard.writeText(window.location.href)}
             className="flex items-center gap-2 text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-medium border border-blue-100"
           >
              <Copy className="w-4 h-4" /> Copy Invite Link ({room.players.length}/{room.maxPlayers})
           </button>
        )}

        <button 
           onClick={startNewGame}
           className="flex items-center gap-1.5 text-xs sm:text-sm bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 font-medium"
        >
           <RefreshCcw className="w-4 h-4" /> <span>Start New Game</span>
        </button>
      </header>

      {/* Main Board Area - Flex 1 */}
      <main className="flex-1 min-h-0 relative flex flex-col md:flex-row items-center justify-center gap-8 p-4">
         
         <div className="relative w-full max-w-[500px]">
             {/* Ephemeral Chat Bubbles */}
             {room.players.map(p => {
               if (!p.latestMessage) return null;
               
               // Position based on color
               let posClasses = '';
               if (p.color === 'red') posClasses = 'top-0 left-0 -translate-x-4 -translate-y-full';
               if (p.color === 'green') posClasses = 'top-0 right-0 translate-x-4 -translate-y-full';
               if (p.color === 'yellow') posClasses = 'bottom-0 right-0 translate-x-4 translate-y-full';
               if (p.color === 'blue') posClasses = 'bottom-0 left-0 -translate-x-4 translate-y-full';
               
               return (
                 <div key={`chat-${p.id}`} className={`absolute z-50 ${posClasses} pointer-events-none transition-all`}>
                    <div className="bg-slate-800 text-white text-xs md:text-sm px-3 py-2 rounded-xl rounded-bl-sm shadow-xl max-w-[120px] md:max-w-[160px] truncate animate-in fade-in slide-in-from-bottom-2">
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

         {/* Controls Area */}
         {room.gameState === 'playing' && (
           <div className="shrink-0 w-full max-w-[300px] flex flex-col gap-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center flex flex-col items-center">
                 <p className="text-sm text-slate-500 uppercase tracking-widest font-bold mb-4">Current Turn</p>
                 <div className="flex items-center gap-3 justify-center mb-6">
                    <div className={`w-4 h-4 rounded-full ${colorMapClasses[room.activeColor]} shadow-md`}></div>
                    <span className="text-xl font-black capitalize text-slate-800">{room.activeColor}</span>
                 </div>
                 
                 <div className="h-24 flex items-center justify-center mb-6 w-full">
                    {room.diceValue ? (
                      <div className="w-16 h-16 bg-slate-900 text-white rounded-xl flex items-center justify-center text-4xl font-black shadow-lg animate-in zoom-in-50">
                         {room.diceValue}
                      </div>
                    ) : (
                      <Dice5 className={`w-16 h-16 text-slate-200 ${myTurn ? 'animate-bounce text-slate-400' : ''}`} />
                    )}
                 </div>

                 {myTurn ? (
                   <button 
                     onClick={rollDice}
                     disabled={room.diceRolled}
                     className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${!room.diceRolled ? `${colorMapClasses[myColor!]} text-white shadow-xl hover:scale-105 active:scale-95` : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                   >
                     {room.diceRolled ? 'Move a token' : 'Roll Dice'}
                   </button>
                 ) : (
                   <div className="text-slate-400 font-medium py-4">Waiting for {room.activeColor}...</div>
                 )}
              </div>
           </div>
         )}
         
         {room.gameState === 'finished' && (
             <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-30 flex items-center justify-center">
                 <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm">
                    <h2 className="text-3xl font-black text-slate-800 mb-4">Game Over!</h2>
                    <button onClick={startNewGame} className="w-full py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600">Start New Game</button>
                 </div>
             </div>
         )}

      </main>

      {/* Chat / Bottom Area - Instant Ephemeral Chat */}
      <footer className="bg-white border-t border-slate-200 p-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
         <form onSubmit={sendChat} className="flex gap-2 max-w-3xl mx-auto">
            <input 
              type="text" 
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Type a quick message or emoji..."
              className="flex-1 bg-slate-100 border-none outline-none focus:ring-2 focus:ring-red-500 rounded-xl px-4 py-3 placeholder-slate-400 text-slate-800"
              maxLength={40}
            />
            <button 
              type="submit"
              disabled={!chatInput.trim()}
              className="bg-slate-900 text-white w-12 h-12 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50 hover:bg-slate-800 transition-colors"
            >
              <SendHorizontal className="w-5 h-5" />
            </button>
         </form>
      </footer>
    </div>
  );
}
