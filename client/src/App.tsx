import React, { useState, useEffect } from 'react';
import { PublicGameState, PlayerDTO, BoardTileDTO, RewardDTO, PunishmentDTO, GameRulesDTO, BoardTemplateDTO } from './types';
import { api } from './services/api';
import { getSocket, joinRoomSocket } from './services/socket';
import { soundFX } from './utils/audio';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import { HostAdminDashboard } from './components/admin/HostAdminDashboard';
import { Plus, ArrowRight, Dices, Sparkles, Shield, Trophy, Check, Sliders } from 'lucide-react';

const SESSION_KEY = 'polyrich_session_id';
const ROOM_KEY = 'polyrich_room_code';
const TEMPLATE_KEY = 'polyrich_custom_template';

export function App() {
  const [screen, setScreen] = useState<'HOME' | 'LOBBY' | 'GAME'>('HOME');
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Player & Game State
  const [playerName, setPlayerName] = useState<string>('');
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [currentPlayer, setCurrentPlayer] = useState<PlayerDTO | null>(null);
  const [gameState, setGameState] = useState<PublicGameState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Saved Template state
  const [savedTemplate, setSavedTemplate] = useState<BoardTemplateDTO | null>(null);
  const [useCustomTemplate, setUseCustomTemplate] = useState<boolean>(true);

  // Initialize from URL params or local storage for automatic reconnection & template load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Invite links are generated as /room/:code. Also accept ?room=:code for
    // older/shared links so guests land in the lobby with the code filled in.
    const pathRoomMatch = window.location.pathname.match(/^\/room\/([A-Za-z0-9]{6})\/?$/);
    const roomParam = params.get('room') || pathRoomMatch?.[1];
    if (roomParam) {
      setRoomCodeInput(roomParam.toUpperCase());
    }

    // Check for saved template
    const storedTpl = localStorage.getItem(TEMPLATE_KEY);
    if (storedTpl) {
      try {
        setSavedTemplate(JSON.parse(storedTpl));
      } catch (e) {
        console.error(e);
      }
    }

    // Templates are stored on the server so the host can use the same default
    // board from another browser or device.
    api.getDefaultTemplate().then((template) => {
      if (template?.id) {
        setSavedTemplate(template);
        localStorage.setItem(TEMPLATE_KEY, JSON.stringify(template));
      }
    }).catch((error) => console.warn('Could not load the saved board template:', error));

    const savedSession = localStorage.getItem(SESSION_KEY);
    const savedRoom = localStorage.getItem(ROOM_KEY);

    if (savedSession && savedRoom) {
      api.getRoom(savedRoom).then(res => {
        if (res.state) {
          joinRoomSocket(savedRoom, savedSession, undefined, undefined, undefined, {
            onJoined: (data) => {
              setCurrentPlayer(data.player);
              setGameState(data.state);
              setScreen(data.state.status === 'PLAYING' ? 'GAME' : 'LOBBY');
            },
            onStateUpdate: (state) => {
              setGameState(state);
              if (state.status === 'PLAYING') setScreen('GAME');
              else if (state.status === 'LOBBY') setScreen('LOBBY');
            },
            onDiceRolled: (data) => {
              soundFX.playDiceRoll();
              setGameState(data.state);
            },
            onError: (msg) => {
              console.warn('Reconnect error:', msg);
              localStorage.removeItem(SESSION_KEY);
              localStorage.removeItem(ROOM_KEY);
            }
          });
        }
      }).catch(() => {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(ROOM_KEY);
      });
    }
  }, []);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFX.enabled = next;
  };

  // ================= CREATE ROOM =================
  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setErrorMessage('Please enter your player name.');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);

    try {
      soundFX.playClick();
      // Pass saved custom template if available so the host doesn't have to reconfigure every time!
      const templateToUse = useCustomTemplate && savedTemplate ? savedTemplate.id : 'default-expanded-48';
      const res = await api.createRoom(playerName.trim(), undefined, undefined, templateToUse);

      localStorage.setItem(SESSION_KEY, res.hostPlayer.sessionId);
      localStorage.setItem(ROOM_KEY, res.roomCode);

      setCurrentPlayer(res.hostPlayer);
      setGameState(res.state);

      joinRoomSocket(res.roomCode, res.hostPlayer.sessionId, playerName.trim(), undefined, undefined, {
        onJoined: (data) => {
          setCurrentPlayer(data.player);
          setGameState(data.state);
        },
        onStateUpdate: (state) => {
          setGameState(state);
          if (state.status === 'PLAYING') setScreen('GAME');
        },
        onDiceRolled: (data) => {
          soundFX.playDiceRoll();
          setGameState(data.state);
        },
        onError: (msg) => setErrorMessage(msg)
      });

      setScreen('LOBBY');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  // ================= JOIN ROOM =================
  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setErrorMessage('Please enter your player name.');
      return;
    }
    if (!roomCodeInput.trim()) {
      setErrorMessage('Please enter a room code.');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);

    const code = roomCodeInput.trim().toUpperCase();
    const existingSession = localStorage.getItem(SESSION_KEY) || undefined;

    try {
      soundFX.playClick();
      const res = await api.joinRoom(code, playerName.trim(), undefined, undefined, existingSession);
      localStorage.setItem(SESSION_KEY, res.sessionId);
      localStorage.setItem(ROOM_KEY, code);

      setCurrentPlayer(res.player);
      setGameState(res.state);

      joinRoomSocket(code, res.sessionId, playerName.trim(), undefined, undefined, {
        onJoined: (data) => {
          setCurrentPlayer(data.player);
          setGameState(data.state);
        },
        onStateUpdate: (state) => {
          setGameState(state);
          if (state.status === 'PLAYING') setScreen('GAME');
        },
        onDiceRolled: (data) => {
          soundFX.playDiceRoll();
          setGameState(data.state);
        },
        onError: (msg) => setErrorMessage(msg)
      });

      setScreen(res.state.status === 'PLAYING' ? 'GAME' : 'LOBBY');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  // ================= GAMEPLAY ACTIONS =================
  const handleStartGame = () => {
    if (!gameState || !currentPlayer?.sessionId) return;
    soundFX.playClick();
    const socket = getSocket();
    socket.emit('start_game', {
      roomCode: gameState.roomCode,
      hostSessionId: currentPlayer.sessionId
    });
  };

  const handleAddBot = () => {
    if (!gameState || !currentPlayer?.sessionId) return;
    soundFX.playClick();
    const socket = getSocket();
    socket.emit('add_bot', {
      roomCode: gameState.roomCode,
      hostSessionId: currentPlayer.sessionId
    });
  };

  const handleRemoveBot = (botId?: string) => {
    if (!gameState || !currentPlayer?.sessionId) return;
    soundFX.playClick();
    const socket = getSocket();
    socket.emit('remove_bot', {
      roomCode: gameState.roomCode,
      hostSessionId: currentPlayer.sessionId,
      botId
    });
  };

  const handleToggleReady = () => {
    if (!gameState || !currentPlayer?.sessionId) return;
    soundFX.playClick();
    const socket = getSocket();
    socket.emit('toggle_ready', {
      roomCode: gameState.roomCode,
      sessionId: currentPlayer.sessionId
    });
  };

  const handleRollDice = () => {
    if (!gameState || !currentPlayer?.sessionId) return;
    const socket = getSocket();
    socket.emit('roll_dice', {
      roomCode: gameState.roomCode,
      sessionId: currentPlayer.sessionId
    });
  };

  const handleBuyProperty = () => {
    if (!gameState || !currentPlayer?.sessionId) return;
    soundFX.playCash();
    const socket = getSocket();
    socket.emit('buy_property', {
      roomCode: gameState.roomCode,
      sessionId: currentPlayer.sessionId
    });
  };

  const handleSkipPurchase = () => {
    if (!gameState || !currentPlayer?.sessionId) return;
    soundFX.playClick();
    const socket = getSocket();
    socket.emit('skip_purchase', {
      roomCode: gameState.roomCode,
      sessionId: currentPlayer.sessionId
    });
  };

  const handlePlaceBid = (bidAmount: number) => {
    if (!gameState || !currentPlayer?.sessionId) return;
    const socket = getSocket();
    socket.emit('place_bid', {
      roomCode: gameState.roomCode,
      sessionId: currentPlayer.sessionId,
      bidAmount
    });
  };

  const handleProposeTrade = (
    toPlayerId: string,
    offeredMoney: number,
    offeredTileIds: string[],
    requestedMoney: number,
    requestedTileIds: string[]
  ) => {
    if (!gameState || !currentPlayer?.sessionId) return;
    const socket = getSocket();
    socket.emit('propose_trade', {
      roomCode: gameState.roomCode,
      sessionId: currentPlayer.sessionId,
      toPlayerId,
      offeredMoney,
      offeredTileIds,
      requestedMoney,
      requestedTileIds
    });
  };

  const handleRespondTrade = (accept: boolean) => {
    if (!gameState || !currentPlayer?.sessionId) return;
    soundFX.playClick();
    const socket = getSocket();
    socket.emit('respond_trade', {
      roomCode: gameState.roomCode,
      sessionId: currentPlayer.sessionId,
      accept
    });
  };

  const handleCancelTrade = () => {
    if (!gameState || !currentPlayer?.sessionId) return;
    const socket = getSocket();
    socket.emit('cancel_trade', {
      roomCode: gameState.roomCode,
      sessionId: currentPlayer.sessionId
    });
  };

  const handleMortgageProperty = (tileId: string) => {
    if (!gameState || !currentPlayer?.sessionId) return;
    soundFX.playCash();
    const socket = getSocket();
    socket.emit('mortgage_property', {
      roomCode: gameState.roomCode,
      sessionId: currentPlayer.sessionId,
      tileId
    });
  };

  const handleUnmortgageProperty = (tileId: string) => {
    if (!gameState || !currentPlayer?.sessionId) return;
    soundFX.playCash();
    const socket = getSocket();
    socket.emit('unmortgage_property', {
      roomCode: gameState.roomCode,
      sessionId: currentPlayer.sessionId,
      tileId
    });
  };

  const handleDeclareBankruptcy = () => {
    if (!gameState || !currentPlayer?.sessionId) return;
    if (!window.confirm('Are you sure you want to declare bankruptcy? All your properties will be liquidated and you will be eliminated from the game.')) return;
    soundFX.playPenalty();
    const socket = getSocket();
    socket.emit('declare_bankruptcy', {
      roomCode: gameState.roomCode,
      sessionId: currentPlayer.sessionId
    });
  };

  const handleUpgradeProperty = (tileId: string) => {
    if (!gameState || !currentPlayer?.sessionId) return;
    soundFX.playCash();
    const socket = getSocket();
    socket.emit('upgrade_property', {
      roomCode: gameState.roomCode,
      sessionId: currentPlayer.sessionId,
      tileId
    });
  };

  const handleEndTurn = () => {
    if (!gameState || !currentPlayer?.sessionId) return;
    soundFX.playClick();
    const socket = getSocket();
    socket.emit('end_turn', {
      roomCode: gameState.roomCode,
      sessionId: currentPlayer.sessionId
    });
  };

  const handleLeaveGame = () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ROOM_KEY);
    setGameState(null);
    setCurrentPlayer(null);
    setScreen('HOME');
  };

  const handleBoardSaved = (
    tiles: BoardTileDTO[], 
    rewards: RewardDTO[], 
    punishments: PunishmentDTO[], 
    rules: GameRulesDTO
  ) => {
    if (gameState) {
      setGameState({
        ...gameState,
        boardTiles: tiles,
        rewards,
        punishments,
        rules
      });
      // Also update saved template
      const updatedTpl: BoardTemplateDTO = {
        id: savedTemplate?.id || 'host-default-template',
        name: savedTemplate?.name || 'My Custom Board Template',
        description: 'Auto-saved board template',
        tiles,
        rewards,
        punishments,
        rules,
        updatedAt: new Date().toISOString()
      };
      setSavedTemplate(updatedTpl);
      localStorage.setItem(TEMPLATE_KEY, JSON.stringify(updatedTpl));

      const socket = getSocket();
      socket.emit('board_config_updated', { roomCode: gameState.roomCode });
    }
  };

  // ================= RENDER HOME SCREEN =================
  if (screen === 'HOME') {
    return (
      <div className="min-h-screen bg-[#070914] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Ambient neon orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-600/15 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-[#101428] border border-[#212948] rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col gap-5 relative z-10">
          {/* Logo & Headline */}
          <div className="text-center flex flex-col items-center">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white shadow-neon mb-2">
              <Dices className="w-7 h-7" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wider flex items-center gap-1.5">
              POLYRICH <span className="text-amber-400 text-xs font-bold bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">RICHUP 2D</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Multiplayer Board Game • Auctions • Trading • Bankruptcy
            </p>
          </div>

          {/* Template Status Pill */}
          {savedTemplate && (
            <div className="bg-[#0b0e1e] p-2.5 rounded-2xl border border-indigo-500/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 block font-semibold">Saved Board Template:</span>
                  <span className="text-xs font-bold text-white truncate max-w-[170px] inline-block">{savedTemplate.name}</span>
                </div>
              </div>
              <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomTemplate}
                  onChange={(e) => setUseCustomTemplate(e.target.checked)}
                  className="rounded accent-indigo-500"
                />
                Use for new rooms
              </label>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs text-center">
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Your Display Name
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name (e.g. Tycoon Sarthak)"
                className="w-full bg-[#0a0d1a] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleCreateRoom}
                disabled={isLoading}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 text-white shadow-neon shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Create Room
              </button>
            </div>

            <div className="flex items-center gap-2 my-0.5">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-[11px] text-slate-500 uppercase font-semibold">or join room</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="6-Letter Room Code"
                maxLength={6}
                className="flex-1 bg-[#0a0d1a] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-center uppercase tracking-widest text-amber-400 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleJoinRoom}
                disabled={isLoading}
                className="py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95 flex items-center gap-1"
              >
                Join <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Features Highlights */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center text-[10px] text-slate-400">
            <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-900/40">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>48 Tiles (+8)</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-900/40">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Live Auctions</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-900/40">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Player Trading</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================= RENDER LOBBY SCREEN =================
  if (screen === 'LOBBY' && gameState) {
    return (
      <>
        <LobbyPage
          state={gameState}
          currentPlayer={currentPlayer}
          onStartGame={handleStartGame}
          onToggleReady={handleToggleReady}
          onOpenEditor={() => setIsEditorOpen(true)}
          onAddBot={handleAddBot}
          onRemoveBot={handleRemoveBot}
        />
        {isEditorOpen && currentPlayer?.sessionId && (
          <HostAdminDashboard
            roomCode={gameState.roomCode}
            hostSessionId={currentPlayer.sessionId}
            initialTiles={gameState.boardTiles}
            initialRewards={gameState.rewards}
            initialPunishments={gameState.punishments}
            initialRules={gameState.rules}
            onClose={() => setIsEditorOpen(false)}
            onSaved={handleBoardSaved}
          />
        )}
      </>
    );
  }

  // ================= RENDER GAME SCREEN =================
  if (screen === 'GAME' && gameState) {
    return (
      <>
        <GamePage
          state={gameState}
          currentPlayer={currentPlayer}
          onRollDice={handleRollDice}
          onBuyProperty={handleBuyProperty}
          onSkipPurchase={handleSkipPurchase}
          onUpgradeProperty={handleUpgradeProperty}
          onEndTurn={handleEndTurn}
          onOpenEditor={() => setIsEditorOpen(true)}
          onLeaveGame={handleLeaveGame}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onPlaceBid={handlePlaceBid}
          onProposeTrade={handleProposeTrade}
          onRespondTrade={handleRespondTrade}
          onCancelTrade={handleCancelTrade}
          onMortgageProperty={handleMortgageProperty}
          onUnmortgageProperty={handleUnmortgageProperty}
          onDeclareBankruptcy={handleDeclareBankruptcy}
        />
        {isEditorOpen && currentPlayer?.sessionId && (
          <HostAdminDashboard
            roomCode={gameState.roomCode}
            hostSessionId={currentPlayer.sessionId}
            initialTiles={gameState.boardTiles}
            initialRewards={gameState.rewards}
            initialPunishments={gameState.punishments}
            initialRules={gameState.rules}
            onClose={() => setIsEditorOpen(false)}
            onSaved={handleBoardSaved}
          />
        )}
      </>
    );
  }

  return null;
}

export default App;
