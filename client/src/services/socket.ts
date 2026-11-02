import { io, Socket } from 'socket.io-client';
import { PublicGameState, PlayerDTO } from '../types';

let socket: Socket | null = null;
let activeJoinData: { roomCode: string; sessionId: string; playerName?: string; avatar?: string; color?: string } | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000
    });

    // Automatically re-join the room if the socket reconnects
    socket.on('connect', () => {
      if (activeJoinData && socket) {
        socket.emit('join_room', activeJoinData);
      }
    });
  }
  return socket;
}

export interface SocketEvents {
  join_room: (data: { roomCode: string; sessionId: string; playerName?: string; avatar?: string; color?: string }) => void;
  start_game: (data: { roomCode: string; hostSessionId: string }) => void;
  add_bot: (data: { roomCode: string; hostSessionId: string }) => void;
  remove_bot: (data: { roomCode: string; hostSessionId: string; botId?: string }) => void;
  toggle_ready: (data: { roomCode: string; sessionId: string }) => void;
  roll_dice: (data: { roomCode: string; sessionId: string }) => void;
  buy_property: (data: { roomCode: string; sessionId: string }) => void;
  skip_purchase: (data: { roomCode: string; sessionId: string }) => void;
  upgrade_property: (data: { roomCode: string; sessionId: string; tileId: string }) => void;
  end_turn: (data: { roomCode: string; sessionId: string }) => void;
  board_config_updated: (data: { roomCode: string }) => void;
}

export function joinRoomSocket(
  roomCode: string, 
  sessionId: string, 
  playerName?: string, 
  avatar?: string, 
  color?: string,
  callbacks?: {
    onJoined?: (data: { player: PlayerDTO; state: PublicGameState; isReconnect: boolean }) => void;
    onStateUpdate?: (state: PublicGameState) => void;
    onDiceRolled?: (data: { dice: [number, number]; total: number; activePlayerId: string; state: PublicGameState }) => void;
    onError?: (msg: string) => void;
  }
) {
  const s = getSocket();

  activeJoinData = { roomCode, sessionId, playerName, avatar, color };

  s.off('room_joined');
  s.off('game_state_updated');
  s.off('game_started');
  s.off('dice_rolled');
  s.off('turn_ended');
  s.off('error_message');

  if (callbacks?.onJoined) {
    s.on('room_joined', callbacks.onJoined);
  }

  if (callbacks?.onStateUpdate) {
    s.on('game_state_updated', callbacks.onStateUpdate);
    s.on('game_started', callbacks.onStateUpdate);
    s.on('turn_ended', callbacks.onStateUpdate);
  }

  if (callbacks?.onDiceRolled) {
    s.on('dice_rolled', callbacks.onDiceRolled);
  }

  if (callbacks?.onError) {
    s.on('error_message', (d: { message: string }) => callbacks.onError!(d.message));
  }

  s.emit('join_room', activeJoinData);
}

export function leaveRoomSocket() {
  activeJoinData = null;
  if (socket) {
    socket.off('room_joined');
    socket.off('game_state_updated');
    socket.off('game_started');
    socket.off('dice_rolled');
    socket.off('turn_ended');
    socket.off('error_message');
  }
}
