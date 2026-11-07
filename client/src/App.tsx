import React, { useState, useEffect } from 'react';
import { PublicGameState, PlayerDTO, BoardTileDTO, RewardDTO, PunishmentDTO, GameRulesDTO, BoardTemplateDTO } from './types';
import { api } from './services/api';
import { getSocket, joinRoomSocket, leaveRoomSocket } from './services/socket';
import { soundFX } from './utils/audio';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import { HostAdminDashboard } from './components/admin/HostAdminDashboard';
import { GoogleAuthModal } from './components/modals/GoogleAuthModal';
import { googleAuth, GoogleUserProfile } from './services/googleAuth';
import { Plus, ArrowRight, Dices, Sparkles, Shield, Trophy, Check, Sliders, User, LogOut as LogOutIcon } from 'lucide-react';

const SESSION_KEY = 'polyrich_session_id';
const ROOM_KEY = 'polyrich_room_code';
const TEMPLATE_KEY = 'polyrich_custom_template';
const GOOGLE_USER_KEY = 'polyrich_google_user';

// Use sessionStorage (tab-scoped) with fallback to localStorage
// This allows testing multiple players/tabs on the same browser without session hijacking
const getSessionIdForRoom = (roomCode?: string): string | undefined => {
  if (roomCode) {
    const code = roomCode.toUpperCase();
    return sessionStorage.getItem(`polyrich_session_${code}`) || undefined;
  }
  return sessionStorage.getItem(SESSION_KEY) || undefined;
};

const saveSessionForRoom = (roomCode: string, sessionId: string) => {
  const code = roomCode.toUpperCase();
  sessionStorage.setItem(SESSION_KEY, sessionId);
  sessionStorage.setItem(`polyrich_session_${code}`, sessionId);
  localStorage.setItem(SESSION_KEY, sessionId);
  localStorage.setItem(`polyrich_session_${code}`, sessionId);
  localStorage.setItem(ROOM_KEY, code);
};

export function App() {
  const [screen, setScreen] = useState<'HOME' | 'LOBBY' | 'GAME'>('HOME');
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState<boolean>(false);
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

  // Google User Profile state
  const [googleUser, setGoogleUser] = useState<GoogleUserProfile | null>(() => {
    return googleAuth.getStoredUser();
  });

  // Helper to keep both gameState and currentPlayer strictly synchronized
  const updatePlayerAndState = (newState: PublicGameState) => {
    setGameState(newState);
    setCurrentPlayer(prev => {
      if (!prev) return prev;
      const updated = newState.players.find(p => p.id === prev.id || (prev.sessionId && p.sessionId === prev.sessionId));
      return updated ? { ...prev, ...updated } : prev;
    });
  };

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
    const userIdent = googleUser?.email || googleUser?.sub;
    api.getDefaultTemplate(userIdent).then((template) => {
      if (template?.id && Array.isArray(template.tiles)) {
        setSavedTemplate(template);
        localStorage.setItem(TEMPLATE_KEY, JSON.stringify(template));
      }
    }).catch((error) => console.warn('Could not load the saved board template:', error));

    const savedSession = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
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
              updatePlayerAndState(state);
              if (state.status === 'PLAYING') setScreen('GAME');
              else if (state.status === 'LOBBY') setScreen('LOBBY');
            },
            onDiceRolled: (data) => {
              soundFX.playDiceRoll();
              updatePlayerAndState(data.state);
            },
            onError: (msg) => {
              console.warn('Reconnect error:', msg);
              sessionStorage.removeItem(SESSION_KEY);
              localStorage.removeItem(SESSION_KEY);
              localStorage.removeItem(ROOM_KEY);
            }
          });
        }
      }).catch(() => {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(ROOM_KEY);
      });
    }
  }, []);

  // Polling fallback to guarantee real-time sync in lobby and game even on mobile or network hiccups
  useEffect(() => {
    if ((screen !== 'LOBBY' && screen !== 'GAME') || !gameState?.roomCode) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.getRoom(gameState.roomCode);
        if (res.state) {
          updatePlayerAndState(res.state);
          if (res.state.status === 'PLAYING' && screen !== 'GAME') {
            setScreen('GAME');
          }
        }
      } catch (e) {
        // silently ignore transient network blips
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [screen, gameState?.roomCode]);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFX.enabled = next;
  };

  // Google Sign-In handlers: syncs profile and user's custom templates
  const handleGoogleSuccess = async (user: GoogleUserProfile) => {
    setGoogleUser(user);
    if (!playerName.trim()) {
      setPlayerName(user.name);
    }
    // Fetch and load custom board template linked to this Google account
    try {
      const userIdent = user.email || user.sub;
      const tpl = await api.getDefaultTemplate(userIdent);
      if (tpl?.id) {
        setSavedTemplate(tpl);
        localStorage.setItem(TEMPLATE_KEY, JSON.stringify(tpl));
      }
    } catch (e) {
      console.warn('Could not sync user template:', e);
    }
  };

  const handleGoogleLogout = () => {
    googleAuth.signOut();
    setGoogleUser(null);
    soundFX.playClick();
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
      // Pass full saved custom template if available so that all customized tiles, images, districts, and prices load directly!
      const templateToUse = (useCustomTemplate && savedTemplate && savedTemplate.tiles && savedTemplate.tiles.length > 0)
        ? savedTemplate
        : undefined;
      const res = await api.createRoom(playerName.trim(), undefined, undefined, templateToUse);

      saveSessionForRoom(res.roomCode, res.hostPlayer.sessionId);

      setCurrentPlayer(res.hostPlayer);
      setGameState(res.state);

      joinRoomSocket(res.roomCode, res.hostPlayer.sessionId, playerName.trim(), undefined, undefined, {
        onJoined: (data) => {
          setCurrentPlayer(data.player);
          setGameState(data.state);
        },
        onStateUpdate: (state) => {
          updatePlayerAndState(state);
          if (state.status === 'PLAYING') setScreen('GAME');
          else if (state.status === 'LOBBY') setScreen('LOBBY');
        },
        onDiceRolled: (data) => {
          soundFX.playDiceRoll();
          updatePlayerAndState(data.state);
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
    // Unique session per tab prevents session hijacking when testing 2 players on same PC
    const existingSession = getSessionIdForRoom(code);

    try {
      soundFX.playClick();
      const res = await api.joinRoom(code, playerName.trim(), undefined, undefined, existingSession);
      saveSessionForRoom(code, res.sessionId);

      setCurrentPlayer(res.player);
      setGameState(res.state);

      joinRoomSocket(code, res.sessionId, playerName.trim(), undefined, undefined, {
        onJoined: (data) => {
          setCurrentPlayer(data.player);
          setGameState(data.state);
        },
        onStateUpdate: (state) => {
          updatePlayerAndState(state);
          if (state.status === 'PLAYING') setScreen('GAME');
          else if (state.status === 'LOBBY') setScreen('LOBBY');
        },
        onDiceRolled: (data) => {
          soundFX.playDiceRoll();
          updatePlayerAndState(data.state);
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
  const handleStartGame = async () => {
    if (!gameState || !currentPlayer?.sessionId) return;
    soundFX.playClick();
    setErrorMessage(null);
    try {
      // 1. Emit via WebSocket
      const socket = getSocket();
      socket.emit('start_game', {
        roomCode: gameState.roomCode,
        hostSessionId: currentPlayer.sessionId
      });
      // 2. Also call REST endpoint to ensure instantaneous launch even on network lag
      const res = await api.startGame(gameState.roomCode, currentPlayer.sessionId);
      if (res.state) {
        setGameState(res.state);
        setScreen('GAME');
      }
    } catch (err: any) {
      console.error('Start game error:', err);
      setErrorMessage(err.message || 'Failed to start game');
    }
  };

  const handleAddBot = async () => {
    if (!gameState || !currentPlayer?.sessionId) return;
    soundFX.playClick();
    try {
      const socket = getSocket();
      socket.emit('add_bot', {
        roomCode: gameState.roomCode,
        hostSessionId: currentPlayer.sessionId
      });
      const res = await api.addBot(gameState.roomCode, currentPlayer.sessionId);
      if (res.state) setGameState(res.state);
    } catch (err: any) {
      console.error('Add bot error:', err);
      setErrorMessage(err.message || 'Failed to add bot');
    }
  };

  const handleRemoveBot = async (botId?: string) => {
    if (!gameState || !currentPlayer?.sessionId) return;
    soundFX.playClick();
    try {
      const socket = getSocket();
      socket.emit('remove_bot', {
        roomCode: gameState.roomCode,
        hostSessionId: currentPlayer.sessionId,
        botId
      });
      const res = await api.removeBot(gameState.roomCode, currentPlayer.sessionId, botId);
      if (res.state) setGameState(res.state);
    } catch (err: any) {
      console.error('Remove bot error:', err);
      setErrorMessage(err.message || 'Failed to remove bot');
    }
  };

  const handleToggleReady = async () => {
    if (!gameState || !currentPlayer?.sessionId) return;
    soundFX.playClick();
    try {
      const socket = getSocket();
      socket.emit('toggle_ready', {
        roomCode: gameState.roomCode,
        sessionId: currentPlayer.sessionId
      });
      const res = await api.toggleReady(gameState.roomCode, currentPlayer.sessionId);
      if (res.state) setGameState(res.state);
    } catch (err: any) {
      console.error('Toggle ready error:', err);
    }
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

  const handlePayBail = () => {
    if (!gameState || !currentPlayer?.sessionId) return;
    soundFX.playCash();
    const socket = getSocket();
    socket.emit('pay_bail', {
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

  const handleSellProperty = (tileId: string) => {
    if (!gameState || !currentPlayer?.sessionId) return;
    soundFX.playCash();
    const socket = getSocket();
    socket.emit('sell_property', {
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
    soundFX.playClick();
    const curCode = gameState?.roomCode;
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ROOM_KEY);
    if (curCode) {
      sessionStorage.removeItem(`polyrich_session_${curCode}`);
      localStorage.removeItem(`polyrich_session_${curCode}`);
    }
    leaveRoomSocket();
    // Clean URL query (?room=...) and path (/room/...)
    if (window.location.search || window.location.pathname.startsWith('/room/')) {
      window.history.replaceState({}, document.title, window.location.origin + window.location.pathname.replace(/\/room\/[A-Za-z0-9]+/, ''));
    }
    setRoomCodeInput('');
    setGameState(null);
    setCurrentPlayer(null);
    setErrorMessage(null);
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

          {/* Google Account Profile / Sign-in */}
          <div className="bg-[#0b0e1e] p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
            {googleUser ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    {googleUser.picture ? (
                      <img src={googleUser.picture} alt={googleUser.name} className="w-8 h-8 rounded-full border border-indigo-400" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                        {googleUser.name.charAt(0)}
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0b0e1e]" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white leading-tight">{googleUser.name}</span>
                      <span className="text-[9px] bg-emerald-950/70 text-emerald-400 border border-emerald-800/40 px-1 py-0.2 rounded font-bold">
                        Cloud Synced
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 leading-tight block truncate max-w-[160px]">{googleUser.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { soundFX.playClick(); setIsGoogleModalOpen(true); }}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition text-[11px] font-semibold px-2"
                    title="Account details & cloud boards"
                  >
                    Account
                  </button>
                  <button
                    onClick={handleGoogleLogout}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                    title="Sign out of Google"
                  >
                    <LogOutIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-200 block">Sign In with Google</span>
                  <span className="text-[10px] text-slate-400">Save custom boards to your account</span>
                </div>
                <button
                  onClick={() => { soundFX.playClick(); setIsGoogleModalOpen(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-900 shadow-md transition active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  Sign In
                </button>
              </div>
            )}
          </div>

          {/* Template Status Card */}
          {savedTemplate && (
            <div className="bg-[#0b0e1e] p-3 rounded-2xl border border-indigo-500/40 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 block font-semibold">Custom Board Template:</span>
                    <span className="text-xs font-bold text-white truncate max-w-[200px] inline-block">{savedTemplate.name}</span>
                  </div>
                </div>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-700/60">
                  <input
                    type="checkbox"
                    checked={useCustomTemplate}
                    onChange={(e) => setUseCustomTemplate(e.target.checked)}
                    className="rounded accent-indigo-500"
                  />
                  <span>Use for Room</span>
                </label>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5 px-0.5">
                <span>
                  {savedTemplate.tiles?.length || 48} tiles • {savedTemplate.tiles?.filter(t => !!t.imageUrl).length || 0} custom photos
                </span>
                <span className="text-emerald-400 font-medium">✓ Loaded</span>
              </div>
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

        <GoogleAuthModal
          isOpen={isGoogleModalOpen}
          onClose={() => setIsGoogleModalOpen(false)}
          currentUser={googleUser}
          onLoginSuccess={handleGoogleSuccess}
          onLogout={handleGoogleLogout}
        />
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
          errorMessage={errorMessage}
          onStartGame={handleStartGame}
          onToggleReady={handleToggleReady}
          onOpenEditor={() => setIsEditorOpen(true)}
          onLeaveRoom={handleLeaveGame}
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
            googleUser={googleUser}
            onClose={() => setIsEditorOpen(false)}
            onSaved={handleBoardSaved}
          />
        )}
        <GoogleAuthModal
          isOpen={isGoogleModalOpen}
          onClose={() => setIsGoogleModalOpen(false)}
          currentUser={googleUser}
          onLoginSuccess={handleGoogleSuccess}
          onLogout={handleGoogleLogout}
        />
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
          onSellProperty={handleSellProperty}
          onDeclareBankruptcy={handleDeclareBankruptcy}
          onPayBail={handlePayBail}
        />
        {isEditorOpen && currentPlayer?.sessionId && (
          <HostAdminDashboard
            roomCode={gameState.roomCode}
            hostSessionId={currentPlayer.sessionId}
            initialTiles={gameState.boardTiles}
            initialRewards={gameState.rewards}
            initialPunishments={gameState.punishments}
            initialRules={gameState.rules}
            googleUser={googleUser}
            onClose={() => setIsEditorOpen(false)}
            onSaved={handleBoardSaved}
          />
        )}
        <GoogleAuthModal
          isOpen={isGoogleModalOpen}
          onClose={() => setIsGoogleModalOpen(false)}
          currentUser={googleUser}
          onLoginSuccess={handleGoogleSuccess}
          onLogout={handleGoogleLogout}
        />
      </>
    );
  }

  return null;
}

export default App;
