import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { Board } from './components/Board';
import { Room, PlayerColor, Player } from './types';
import { Copy, PlusSquare, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, SendHorizontal, RefreshCcw, MonitorSmartphone, Smile, Download } from 'lucide-react';

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
import { passTurn, rollDiceLocal, moveTokenLocal, ALL_COLORS } from './lib/gameEngine';
import { AudioSystem } from './lib/audio';

const SOCKET_URL = (import.meta as any).env?.VITE_APP_URL || window.location.origin;

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
  const [playMode, setPlayMode] = useState<'online' | 'offline' | null>(null);
  
  const [playerCountSelect, setPlayerCountSelect] = useState<number>(4);
  const [chatInput, setChatInput] = useState('');
  const [timerProgress, setTimerProgress] = useState<number>(100);
  
  const [installPromptState, setInstallPromptState] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPromptState(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!installPromptState) return;
    setIsInstalling(true);
    
    try {
        await installPromptState.prompt();
        const { outcome } = await installPromptState.userChoice;
        if (outcome === 'accepted') {
            console.log("App installed");
        }
    } catch (err) {
        console.error("Installation failed", err);
    } finally {
        setIsInstalling(false);
        setIsInstallable(false);
        setInstallPromptState(null);
    }
  };

  // Load offline state on startup if exists
  useEffect(() => {
     const offlineState = localStorage.getItem('ludoOfflineState');
     if (offlineState && !window.location.search.includes('room=')) {
         try {
             const parsed = JSON.parse(offlineState);
             if (parsed.gameState === 'playing') {
                 setPlayMode('offline');
                 setRoomId('OFFLINE');
                 setMyColor('red');
                 setRoom(parsed);
             }
         } catch(e) {}
     }
  }, []);

  // Save offline state when room changes
  useEffect(() => {
     if (playMode === 'offline' && room) {
         localStorage.setItem('ludoOfflineState', JSON.stringify(room));
         
         // Auto-pass offline after short delay if no valid moves
         if (room.gameState === 'playing' && room.diceRolled && room.diceValue) {
                const activePlayer = room.players.find(p => p.color === room.activeColor);
                if (activePlayer) {
                    const hasMove = activePlayer.tokens.some((pos) => {
                        if (pos === 0 && room.diceValue === 6) return true;
                        if (pos > 0 && pos + room.diceValue! <= 57) return true;
                        return false;
                    });
                    
                    if (!hasMove) {
                        setTimeout(() => {
                            setRoom(prev => {
                                if (prev && prev.diceRolled) {
                                    return passTurn(prev);
                                }
                                return prev;
                            });
                        }, 1200);
                    }
                }
             }
         }
  }, [room, playMode]);

  useEffect(() => {
    if (!room?.turnEndTime || room.gameState !== 'playing') {
      setTimerProgress(100);
      return;
    }
    
    let req: number;
    const updateTimer = () => {
        const now = Date.now();
        const left = Math.max(0, room.turnEndTime! - now);
        const pct = (left / 30000) * 100;
        setTimerProgress(pct);
        
        // Auto pass turn for offline if timer runs out
        if (left <= 0 && playMode === 'offline') {
           setRoom(prev => {
              if (prev && prev.gameState === 'playing') {
                  const r = passTurn(prev);
                  r.turnEndTime = Date.now() + 30000;
                  return {...r};
              }
              return prev;
           });
        }

        if (left > 0) req = requestAnimationFrame(updateTimer);
    };
    req = requestAnimationFrame(updateTimer);
    return () => cancelAnimationFrame(req);
  }, [room?.turnEndTime, room?.gameState, playMode]);
  
  useEffect(() => {
    let savedId = localStorage.getItem('ludoPlayerId');
    if (!savedId) {
      savedId = uuidv4();
      localStorage.setItem('ludoPlayerId', savedId);
    }
    setMyId(savedId);

    const match = window.location.search.match(/room=([A-Z0-9]+)/);
    if (match) {
        setRoomId(match[1]);
        setPlayMode('online');
    }
  }, []);

  useEffect(() => {
    if (!myId || playMode === 'offline') return;

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
        setPlayMode(null);
        window.history.replaceState({}, document.title, window.location.pathname);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [myId, roomId, playMode]);

  const createGame = () => {
    if (!socket) return;
    setPlayMode('online');
    socket.emit('createRoom', { maxPlayers: playerCountSelect }, (res: any) => {
      window.history.pushState({}, '', `?room=${res.roomId}`);
      setRoomId(res.roomId);
      socket.emit('joinRoom', { roomId: res.roomId, playerId: myId }, (joinRes: any) => {
        setMyColor(joinRes.playerColor);
      });
    });
  };

  const createOfflineGame = () => {
    let colorsToAssign = ALL_COLORS.slice(0, playerCountSelect);
    if (playerCountSelect === 2) colorsToAssign = ["red", "yellow"];
    if (playerCountSelect === 3) colorsToAssign = ["red", "green", "blue"];

    const fakePlayers: Player[] = colorsToAssign.map(c => ({
       id: `offline-${c}`,
       color: c,
       tokens: [0,0,0,0],
       hasFinished: false
    }));

    setPlayMode('offline');
    setRoomId('OFFLINE');
    setMyColor('red'); 
    
    setRoom({
       id: 'OFFLINE',
       name: 'Local Match',
       maxPlayers: playerCountSelect,
       players: fakePlayers,
       activeColor: 'red',
       diceValue: null,
       diceRolled: false,
       gameState: 'playing',
       sixCount: 0,
       turnEndTime: Date.now() + 2000000 
    });
  };

  const rollDice = () => {
    if (!room) return;
    AudioSystem.init();
    AudioSystem.playDiceRoll();
    
    if (playMode === 'offline') {
       const activeId = room.players.find(p => p.color === room.activeColor)!.id;
       setRoom({...rollDiceLocal(room, activeId)});
    } else {
       if (socket) socket.emit('rollDice', { roomId: room.id, playerId: myId });
    }
  };

  const moveToken = (tokenIndex: number) => {
    if (!room) return;
    AudioSystem.init();
    
    if (playMode === 'offline') {
       const activeId = room.players.find(p => p.color === room.activeColor)!.id;
       const oldState = JSON.stringify(room.players);
       const newRoom = moveTokenLocal(room, activeId, tokenIndex);
       
       if (oldState !== JSON.stringify(newRoom.players)) {
          const countZeros = (r: Room) => r.players.reduce((acc, p) => acc + p.tokens.filter(t => t === 0).length, 0);
          if (countZeros(newRoom) > countZeros(room)) {
             AudioSystem.playCut();
          } else {
             AudioSystem.playMove();   
          }
          if (newRoom.gameState === 'finished') AudioSystem.playWin();
       }
       setRoom({...newRoom});
    } else {
       AudioSystem.playMove();
       if (socket) socket.emit('moveToken', { roomId: room.id, playerId: myId, tokenIndex });
    }
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !room || !chatInput.trim() || playMode === 'offline') return;
    socket.emit('chatMessage', { roomId: room.id, playerId: myId, message: chatInput });
    setChatInput('');
  };

  const startNewGame = () => {
      if(window.confirm("End this game and start a new one? All data will be removed immediately.")) {
          if (playMode === 'offline') {
              createOfflineGame();
          } else if(socket && room) {
              socket.emit('startNewGame', {roomId: room.id});
          }
      }
  }

  if (!roomId || !room) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden text-center space-y-6">
          <div className="bg-red-500 p-8 text-white relative">
             {isInstallable && (
                <button 
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-sm transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {isInstalling ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Installing...
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" /> Install App
                    </>
                  )}
                </button>
             )}
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
                  <div className="flex flex-col gap-3 mt-6">
                    <button 
                      onClick={createOfflineGame}
                      className="w-full py-4 bg-red-500 text-white rounded-xl font-bold text-lg hover:bg-red-600 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                    >
                      <MonitorSmartphone className="w-5 h-5" /> Play Offline (Local)
                    </button>
                    <button 
                      onClick={createGame}
                      className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                    >
                      <PlusSquare className="w-5 h-5" /> Play Online (Invite)
                    </button>
                  </div>
                  
                  <div className="mt-8 text-left border-t border-slate-100 pt-6">
                     <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Join with Invite Link</h3>
                     <div className="flex gap-2">
                        <input 
                           type="text" 
                           placeholder="Paste link or room code" 
                           className="flex-1 bg-slate-100 border-none outline-none focus:ring-2 focus:ring-red-500 rounded-xl px-4 py-3 text-slate-800 text-sm font-medium"
                           onChange={(e) => {
                               const val = e.target.value;
                               const match = val.match(/room=([A-Z0-9]+)/);
                               if (match) {
                                  window.location.href = `/?room=${match[1]}`;
                               } else if (val.match(/^[A-Z0-9]+$/) && val.length > 3) {
                                  window.location.href = `/?room=${val}`;
                               }
                           }}
                        />
                     </div>
                     <p className="text-xs text-slate-400 mt-2">Paste a friend's link to join their online game</p>
                  </div>
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

  const myTurn = playMode === 'offline' ? true : room.activeColor === myColor;

  let boardRotation = 0;
  if (playMode === 'online') {
     if (myColor === 'red') boardRotation = -90;
     else if (myColor === 'green') boardRotation = 180;
     else if (myColor === 'yellow') boardRotation = 90;
  }

  const startNewGameClick = () => {
     if (playMode === 'offline') {
         localStorage.removeItem('ludoOfflineState');
         window.location.reload();
     } else {
         if (socket) {
             socket.emit('quitRoom', { roomId: room.id, playerId: myId });
         }
         window.location.href = '/';
     }
  };

  return (
    <div className="fixed inset-0 bg-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Header - Minimal Branding */}
      <header className="bg-white border-b border-slate-200 px-3 py-1.5 flex items-center justify-between shrink-0 shadow-sm z-20 h-12">
        <div className="flex items-center gap-2">
           <div className="bg-[#ff0000] rounded px-2 py-0.5 flex items-center justify-center text-white font-black text-sm tracking-widest leading-none drop-shadow-sm">সংকেত</div>
        </div>
        
        <div className="flex gap-2">
          <button 
             onClick={startNewGameClick}
             className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-md hover:bg-slate-200 font-bold"
          >
             <RefreshCcw className="w-4 h-4" /> <span className="hidden sm:inline">{playMode === 'offline' ? 'নতুন গেম' : 'কুইট করুন'}</span>
          </button>
        </div>
      </header>

      {/* Main Board Area - Flex 1 */}
      <main className="flex-1 min-h-0 flex flex-col items-center justify-center relative p-8 md:p-12 gap-3 overflow-hidden">
         
         <div 
           className="relative w-full h-full max-h-[85vmin] max-w-[85vmin] flex items-center justify-center shrink transition-transform duration-700 ease-in-out"
           style={{ transform: `rotate(${boardRotation}deg)` }}
         >
             {/* Ephemeral Chat Bubbles */}
             {room.players.map(p => {
               if (!p.latestMessage) return null;
               
               let posClasses = '';
               if (p.color === 'red') posClasses = 'top-6 left-6';
               if (p.color === 'green') posClasses = 'top-6 right-6';
               if (p.color === 'yellow') posClasses = 'bottom-6 right-6';
               if (p.color === 'blue') posClasses = 'bottom-6 left-6';
               
               return (
                 <div key={`chat-${p.id}`} className={`absolute z-50 ${posClasses} pointer-events-none transition-all`} style={{ transform: `rotate(${-boardRotation}deg)` }}>
                    <div className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded-xl shadow-xl max-w-[120px] truncate animate-in zoom-in">
                       {p.latestMessage}
                    </div>
                 </div>
               )
             })}
             
             {/* Player Dice Boxes outside board */}
             {room.players.map(p => {
                 let boxPos = '';
                 let bColor = '';
                 if (p.color === 'red') { boxPos = '-top-8 -left-8 md:-top-10 md:-left-10'; bColor = 'bg-red-500 border-red-700 text-white'; }
                 if (p.color === 'green') { boxPos = '-top-8 -right-8 md:-top-10 md:-right-10'; bColor = 'bg-green-500 border-green-700 text-white'; }
                 if (p.color === 'yellow') { boxPos = '-bottom-8 -right-8 md:-bottom-10 md:-right-10'; bColor = 'bg-yellow-400 border-yellow-600 text-slate-800'; }
                 if (p.color === 'blue') { boxPos = '-bottom-8 -left-8 md:-bottom-10 md:-left-10'; bColor = 'bg-blue-500 border-blue-700 text-white'; }
                 
                 const isActive = room.activeColor === p.color;
                 const canRoll = isActive && !room.diceRolled && (playMode === 'offline' || myTurn);
                 const dVal = isActive ? room.diceValue : (p.lastDiceValue || null);
                 
                 return (
                     <button
                         key={`dice-${p.color}`}
                         onClick={() => { if (canRoll) rollDice(); }}
                         disabled={!canRoll}
                         className={`absolute z-40 w-16 h-16 md:w-20 md:h-20 rounded-2xl border-4 shadow-xl flex items-center justify-center transition-all duration-300 ${boxPos} ${bColor} ${isActive ? 'ring-4 ring-white/50 z-50 opacity-100' : 'opacity-0 pointer-events-none'} ${canRoll ? 'cursor-pointer hover:scale-125 hover:rotate-12' : 'cursor-default'}`}
                         style={{ transform: isActive ? `rotate(${-boardRotation}deg) scale(1.1)` : `rotate(${-boardRotation}deg) scale(0.5)` }}
                     >
                         <div className="w-[80%] h-[80%] bg-white/90 rounded-xl flex items-center justify-center text-slate-800">
                             {dVal ? (
                                 <DiceIcon val={dVal} className="w-full h-full p-2" />
                             ) : (
                                 <DiceIcon val={null} className={`w-full h-full p-2 text-slate-300 ${canRoll ? 'animate-bounce text-slate-400' : ''}`} />
                             )}
                         </div>
                     </button>
                 );
             })}

             <Board 
               players={room.players} 
               onTokenClick={moveToken} 
               rollDice={rollDice}
               myId={playMode === 'offline' ? room.players.find(p => p.color === room.activeColor)!.id : myId}
               activeColor={room.activeColor}
               diceRolled={room.diceRolled}
               diceValue={room.diceValue}
             />
         </div>
         
         {/* Timer visual indicator just stuck to bottom edge instead since we removed the box */}
         {room.gameState === 'playing' && (
             <div className="absolute bottom-20 left-0 right-0 h-1 bg-transparent px-4">
                <div className="w-full max-w-[400px] h-full mx-auto bg-slate-200/50 rounded-full overflow-hidden">
                    <div className={`h-full ${colorMapClasses[room.activeColor]} transition-none`} style={{ width: `${timerProgress}%` }} />
                </div>
             </div>
         )}
         
         {room.gameState === 'finished' && (
             <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-30 flex items-center justify-center overflow-hidden">
                 <div className="bg-white p-6 rounded-2xl shadow-2xl text-center max-w-xs w-full animate-in zoom-in mx-4">
                    <h2 className="text-3xl font-black text-slate-800 mb-2">Game Over!</h2>
                    <p className="text-sm text-slate-500 mb-6">Would you like to play again?</p>
                    <div className="flex flex-col gap-3">
                        <button onClick={startNewGameClick} className="w-full py-3 bg-red-500 hover:bg-red-600 transition-colors text-white font-bold rounded-xl shadow-md">Restart Match</button>
                        {playMode === 'online' && (
                            <button onClick={() => { setRoomId(null); setRoom(null); setPlayMode(null); window.history.replaceState({}, document.title, window.location.pathname); }} className="w-full py-3 bg-slate-800 hover:bg-slate-900 transition-colors text-white font-bold rounded-xl shadow-md">New Invite (Lobby)</button>
                        )}
                    </div>
                 </div>
             </div>
         )}
      </main>

      {/* compact chat */}
      {playMode !== 'offline' && (
        <footer className="bg-white border-t border-slate-200 shrink-0 shadow-sm z-50 relative flex flex-col items-center">
           <div className="w-full max-w-[400px] flex justify-between px-2 py-1 bg-slate-50 border-b border-slate-100">
               {['👍', '😂', '🔥', '😡', '😱', '👏'].map(emoji => (
                   <button 
                      key={emoji}
                      onClick={() => {
                          if (socket && room && playMode === 'online') {
                              socket.emit('chatMessage', { roomId: room.id, playerId: myId, message: emoji });
                          }
                      }}
                       className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer active:scale-95"
                   >{emoji}</button>
               ))}
           </div>
           <form onSubmit={sendChat} className="flex gap-2 w-full max-w-[400px] p-1.5 h-14">
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
      )}
    </div>
  );
}
