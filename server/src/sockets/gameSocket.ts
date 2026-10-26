import { Server, Socket } from 'socket.io';
import { RoomManager } from '../services/roomManager.js';

export function setupGameSockets(io: Server) {
  const roomManager = RoomManager.getInstance();

  function triggerBotTurnIfNeeded(roomCode: string) {
    const room = roomManager.getRoom(roomCode);
    if (!room || room.status !== 'PLAYING') return;

    const activePlayer = room.players[room.currentTurnIdx];
    if (!activePlayer || !activePlayer.isBot || activePlayer.isBankrupt) return;

    // Automated Bot Turn logic
    setTimeout(() => {
      try {
        const curRoom = roomManager.getRoom(roomCode);
        if (!curRoom || curRoom.status !== 'PLAYING') return;
        const curPlayer = curRoom.players[curRoom.currentTurnIdx];
        if (!curPlayer || curPlayer.id !== activePlayer.id) return;

        // Step 1: Roll Dice
        if (curRoom.actionStage === 'AWAITING_ROLL') {
          const updated = roomManager.rollDice(roomCode, curPlayer.sessionId);
          io.to(roomCode.toUpperCase()).emit('dice_rolled', {
            dice: updated.dice,
            total: updated.lastRollTotal,
            activePlayerId: updated.activePlayerId,
            state: roomManager.getPublicState(updated)
          });

          // Step 2: Handle Landed Action after movement animation
          setTimeout(() => {
            try {
              const afterRollRoom = roomManager.getRoom(roomCode);
              if (!afterRollRoom || afterRollRoom.status !== 'PLAYING') return;

              if (afterRollRoom.actionStage === 'AWAITING_BUY_DECISION') {
                const tile = afterRollRoom.boardTiles[curPlayer.position];
                // Smart bot: buy if has enough money buffer ($150+)
                if (tile && curPlayer.money >= tile.price + 100) {
                  const boughtRoom = roomManager.buyProperty(roomCode, curPlayer.sessionId);
                  io.to(roomCode.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(boughtRoom));
                } else {
                  const skippedRoom = roomManager.skipPurchase(roomCode, curPlayer.sessionId);
                  io.to(roomCode.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(skippedRoom));
                }
              }

              // Step 3: End Turn
              setTimeout(() => {
                try {
                  const endTurnRoom = roomManager.getRoom(roomCode);
                  if (!endTurnRoom || endTurnRoom.status !== 'PLAYING') return;
                  if (endTurnRoom.players[endTurnRoom.currentTurnIdx]?.id === curPlayer.id) {
                    const finalState = roomManager.endTurn(roomCode, curPlayer.sessionId);
                    io.to(roomCode.toUpperCase()).emit('turn_ended', roomManager.getPublicState(finalState));
                    triggerBotTurnIfNeeded(roomCode);
                  }
                } catch (e) {
                  console.error('Bot end turn error:', e);
                }
              }, 1200);

            } catch (e) {
              console.error('Bot action error:', e);
            }
          }, 1500);
        }
      } catch (e) {
        console.error('Bot roll error:', e);
      }
    }, 1200);
  }

  io.on('connection', (socket: Socket) => {
    let currentRoomCode: string | null = null;
    let currentSessionId: string | null = null;

    /**
     * Join Room Socket Event
     */
    socket.on('join_room', (data: { roomCode: string; sessionId: string; playerName?: string; avatar?: string; color?: string }) => {
      try {
        const { roomCode, sessionId, playerName, avatar, color } = data;
        const upperCode = roomCode.toUpperCase();
        
        let room = roomManager.getRoom(upperCode);
        if (!room) {
          socket.emit('error_message', { message: `Room ${upperCode} does not exist.` });
          return;
        }

        const result = roomManager.joinRoom(upperCode, playerName || 'Player', avatar, color, sessionId);
        currentRoomCode = upperCode;
        currentSessionId = result.player.sessionId;

        socket.join(upperCode);

        socket.emit('room_joined', {
          player: result.player,
          state: roomManager.getPublicState(result.room),
          isReconnect: result.isReconnect
        });

        io.to(upperCode).emit('game_state_updated', roomManager.getPublicState(result.room));
      } catch (err: any) {
        socket.emit('error_message', { message: err.message });
      }
    });

    /**
     * Add Bot (Host Only)
     */
    socket.on('add_bot', (data: { roomCode: string; hostSessionId: string }) => {
      try {
        const room = roomManager.addBot(data.roomCode, data.hostSessionId);
        io.to(data.roomCode.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));
      } catch (err: any) {
        socket.emit('error_message', { message: err.message });
      }
    });

    /**
     * Remove Bot (Host Only)
     */
    socket.on('remove_bot', (data: { roomCode: string; hostSessionId: string; botId?: string }) => {
      try {
        const room = roomManager.removeBot(data.roomCode, data.hostSessionId, data.botId);
        io.to(data.roomCode.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));
      } catch (err: any) {
        socket.emit('error_message', { message: err.message });
      }
    });

    /**
     * Host Starts Game
     */
    socket.on('start_game', (data: { roomCode: string; hostSessionId: string }) => {
      try {
        const room = roomManager.startGame(data.roomCode, data.hostSessionId);
        io.to(data.roomCode.toUpperCase()).emit('game_started', roomManager.getPublicState(room));
        triggerBotTurnIfNeeded(data.roomCode);
      } catch (err: any) {
        socket.emit('error_message', { message: err.message });
      }
    });

    /**
     * Toggle Player Ready in Lobby
     */
    socket.on('toggle_ready', (data: { roomCode: string; sessionId: string }) => {
      try {
        const room = roomManager.toggleReady(data.roomCode, data.sessionId);
        io.to(data.roomCode.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));
      } catch (err: any) {
        socket.emit('error_message', { message: err.message });
      }
    });

    /**
     * Roll Dice
     */
    socket.on('roll_dice', (data: { roomCode: string; sessionId: string }) => {
      try {
        const room = roomManager.rollDice(data.roomCode, data.sessionId);
        io.to(data.roomCode.toUpperCase()).emit('dice_rolled', {
          dice: room.dice,
          total: room.lastRollTotal,
          activePlayerId: room.activePlayerId,
          state: roomManager.getPublicState(room)
        });
      } catch (err: any) {
        socket.emit('error_message', { message: err.message });
      }
    });

    /**
     * Buy Property
     */
    socket.on('buy_property', (data: { roomCode: string; sessionId: string }) => {
      try {
        const room = roomManager.buyProperty(data.roomCode, data.sessionId);
        io.to(data.roomCode.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));
      } catch (err: any) {
        socket.emit('error_message', { message: err.message });
      }
    });

    /**
     * Skip Property Purchase (Launches Live Auction)
     */
    socket.on('skip_purchase', (data: { roomCode: string; sessionId: string }) => {
      try {
        const room = roomManager.skipPurchase(data.roomCode, data.sessionId);
        io.to(data.roomCode.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));

        // Start auction ticker countdown if auction activated
        if (room.activeAuction && room.activeAuction.active) {
          const auctionInterval = setInterval(() => {
            const currentR = roomManager.getRoom(data.roomCode);
            if (!currentR || !currentR.activeAuction || !currentR.activeAuction.active) {
              clearInterval(auctionInterval);
              return;
            }

            currentR.activeAuction.timeRemainingSec--;
            if (currentR.activeAuction.timeRemainingSec <= 0) {
              clearInterval(auctionInterval);
              const finishedRoom = roomManager.finishAuction(data.roomCode);
              io.to(data.roomCode.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(finishedRoom));
            } else {
              io.to(data.roomCode.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(currentR));
            }
          }, 1000);
        }
      } catch (err: any) {
        socket.emit('error_message', { message: err.message });
      }
    });

    /**
     * Place Bid in Live Auction (RichUp.io feature)
     */
    socket.on('place_bid', (data: { roomCode: string; sessionId: string; bidAmount: number }) => {
      try {
        const room = roomManager.placeBid(data.roomCode, data.sessionId, data.bidAmount);
        io.to(data.roomCode.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));
      } catch (err: any) {
        socket.emit('error_message', { message: err.message });
      }
    });

    /**
     * Upgrade Property
     */
    socket.on('upgrade_property', (data: { roomCode: string; sessionId: string; tileId: string }) => {
      try {
        const room = roomManager.upgradeProperty(data.roomCode, data.sessionId, data.tileId);
        io.to(data.roomCode.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));
      } catch (err: any) {
        socket.emit('error_message', { message: err.message });
      }
    });

    /**
     * Mortgage Property (RichUp.io feature)
     */
    socket.on('mortgage_property', (data: { roomCode: string; sessionId: string; tileId: string }) => {
      try {
        const room = roomManager.mortgageProperty(data.roomCode, data.sessionId, data.tileId);
        io.to(data.roomCode.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));
      } catch (err: any) {
        socket.emit('error_message', { message: err.message });
      }
    });

    /**
     * Unmortgage Property (RichUp.io feature)
     */
    socket.on('unmortgage_property', (data: { roomCode: string; sessionId: string; tileId: string }) => {
      try {
        const room = roomManager.unmortgageProperty(data.roomCode, data.sessionId, data.tileId);
        io.to(data.roomCode.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));
      } catch (err: any) {
        socket.emit('error_message', { message: err.message });
      }
    });

    /**
     * Declare Bankruptcy (RichUp.io feature)
     */
    socket.on('declare_bankruptcy', (data: { roomCode: string; sessionId: string }) => {
      try {
        const room = roomManager.declareBankruptcy(data.roomCode, data.sessionId);
        io.to(data.roomCode.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));
      } catch (err: any) {
        socket.emit('error_message', { message: err.message });
      }
    });

    /**
     * Propose Trade Deal (RichUp.io feature)
     */
    socket.on('propose_trade', (data: {
      roomCode: string;
      sessionId: string;
      toPlayerId: string;
      offeredMoney: number;
      offeredTileIds: string[];
      requestedMoney: number;
      requestedTileIds: string[];
    }) => {
      try {
        const room = roomManager.proposeTrade(
          data.roomCode,
          data.sessionId,
          data.toPlayerId,
          data.offeredMoney,
          data.offeredTileIds,
          data.requestedMoney,
          data.requestedTileIds
        );
        io.to(data.roomCode.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));
      } catch (err: any) {
        socket.emit('error_message', { message: err.message });
      }
    });

    /**
     * Respond to Trade Deal (RichUp.io feature)
     */
    socket.on('respond_trade', (data: { roomCode: string; sessionId: string; accept: boolean }) => {
      try {
        const room = roomManager.respondTrade(data.roomCode, data.sessionId, data.accept);
        io.to(data.roomCode.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));
      } catch (err: any) {
        socket.emit('error_message', { message: err.message });
      }
    });

    /**
     * Cancel Trade Deal (RichUp.io feature)
     */
    socket.on('cancel_trade', (data: { roomCode: string; sessionId: string }) => {
      try {
        const room = roomManager.cancelTrade(data.roomCode, data.sessionId);
        io.to(data.roomCode.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));
      } catch (err: any) {
        socket.emit('error_message', { message: err.message });
      }
    });

    /**
     * End Turn
     */
    socket.on('end_turn', (data: { roomCode: string; sessionId: string }) => {
      try {
        const room = roomManager.endTurn(data.roomCode, data.sessionId);
        io.to(data.roomCode.toUpperCase()).emit('turn_ended', roomManager.getPublicState(room));
        triggerBotTurnIfNeeded(data.roomCode);
      } catch (err: any) {
        socket.emit('error_message', { message: err.message });
      }
    });

    /**
     * Live Board Update from Host Editor
     */
    socket.on('board_config_updated', (data: { roomCode: string }) => {
      const room = roomManager.getRoom(data.roomCode);
      if (room) {
        io.to(data.roomCode.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));
      }
    });

    /**
     * Disconnect handler
     */
    socket.on('disconnect', () => {
      if (currentSessionId && currentRoomCode) {
        roomManager.setPlayerDisconnected(currentSessionId);
        const room = roomManager.getRoom(currentRoomCode);
        if (room) {
          io.to(currentRoomCode).emit('game_state_updated', roomManager.getPublicState(room));
        }
      }
    });
  });
}
