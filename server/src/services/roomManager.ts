import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs';
import path from 'node:path';
import { 
  PublicGameState, 
  PlayerDTO, 
  BoardTileDTO, 
  RewardDTO, 
  PunishmentDTO, 
  GameRulesDTO, 
  GameTransactionDTO,
  ActionStage,
  TradeProposal,
  AuctionState,
  BoardTemplateDTO
} from '../types/game.js';
import { createDefault48Tiles, DEFAULT_REWARDS, DEFAULT_PUNISHMENTS, DEFAULT_RULES } from '../engine/defaultBoard.js';
import { GameEngine } from '../engine/GameEngine.js';

export interface RoomInstance {
  id: string;
  code: string;
  hostSessionId: string;
  status: 'LOBBY' | 'PLAYING' | 'PAUSED' | 'FINISHED';
  currentTurnIdx: number;
  currentRound: number;
  actionStage: ActionStage;
  activePlayerId: string | null;
  turnExpiresAt: string | null;
  dice: [number, number];
  lastRollTotal: number;
  winner: PlayerDTO | null;
  players: PlayerDTO[];
  boardTiles: BoardTileDTO[];
  rewards: RewardDTO[];
  punishments: PunishmentDTO[];
  rules: GameRulesDTO;
  transactions: GameTransactionDTO[];
  activePopup: any | null;
  activeTrade: TradeProposal | null;
  activeAuction: AuctionState | null;
  auctionTimer?: NodeJS.Timeout | null;
  lastUpdated: number;
}

const PLAYER_COLORS = [
  '#6366f1', // Indigo
  '#f59e0b', // Amber/Gold
  '#10b981', // Emerald
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#a855f7', // Purple
];

export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, RoomInstance> = new Map();
  private sessionToRoom: Map<string, string> = new Map();
  private templates: Map<string, BoardTemplateDTO> = new Map();
  private defaultTemplateId = 'default-expanded-48';
  private readonly templatesFile = process.env.TEMPLATES_FILE || path.resolve(process.cwd(), 'data', 'templates.json');

  private constructor() {
    // Initialize default template
    const defaultTemplate: BoardTemplateDTO = {
      id: 'default-expanded-48',
      name: 'Default Expanded 48-Tile Board',
      description: 'Standard 48-tile layout with 2 extra places per side (+8 tiles total)',
      tiles: createDefault48Tiles(),
      rewards: DEFAULT_REWARDS,
      punishments: DEFAULT_PUNISHMENTS,
      rules: DEFAULT_RULES,
      updatedAt: new Date().toISOString()
    };
    this.templates.set(defaultTemplate.id, defaultTemplate);
    this.loadTemplates();
  }

  private loadTemplates(): void {
    try {
      if (!fs.existsSync(this.templatesFile)) return;
      const saved = JSON.parse(fs.readFileSync(this.templatesFile, 'utf8')) as {
        defaultTemplateId?: string;
        templates?: BoardTemplateDTO[];
      };
      for (const template of saved.templates || []) {
        if (template?.id && Array.isArray(template.tiles)) this.templates.set(template.id, template);
      }
      if (saved.defaultTemplateId && this.templates.has(saved.defaultTemplateId)) {
        this.defaultTemplateId = saved.defaultTemplateId;
      }
    } catch (error) {
      console.error('Could not load saved board templates:', error);
    }
  }

  private persistTemplates(): void {
    try {
      const directory = path.dirname(this.templatesFile);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
      fs.writeFileSync(this.templatesFile, JSON.stringify({
        defaultTemplateId: this.defaultTemplateId,
        templates: Array.from(this.templates.values())
      }, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to persist board templates to disk:', err);
    }
  }

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  /**
   * Save a board as reusable template
   */
  public saveTemplate(
    name: string,
    description: string,
    tiles: BoardTileDTO[],
    rewards: RewardDTO[],
    punishments: PunishmentDTO[],
    rules: GameRulesDTO,
    existingId?: string,
    userId?: string,
    userEmail?: string
  ): BoardTemplateDTO {
    const id = existingId || `tpl-${Date.now()}-${uuidv4().slice(0, 6)}`;
    const template: BoardTemplateDTO = {
      id,
      name: name || 'Custom Board Template',
      description: description || 'User saved board template',
      tiles: JSON.parse(JSON.stringify(tiles)),
      rewards: JSON.parse(JSON.stringify(rewards)),
      punishments: JSON.parse(JSON.stringify(punishments)),
      rules: JSON.parse(JSON.stringify(rules)),
      userId,
      userEmail,
      updatedAt: new Date().toISOString()
    };
    this.templates.set(id, template);
    this.defaultTemplateId = id;
    this.persistTemplates();
    return template;
  }

  public getTemplates(userIdentifier?: string): BoardTemplateDTO[] {
    const all = Array.from(this.templates.values());
    if (!userIdentifier) return all;
    return all.filter(t => !t.userId || t.userId === userIdentifier || t.userEmail === userIdentifier || t.id.startsWith('default-'));
  }

  public getUserTemplates(userIdentifier: string): BoardTemplateDTO[] {
    if (!userIdentifier) return [];
    return Array.from(this.templates.values()).filter(t => t.userId === userIdentifier || t.userEmail === userIdentifier);
  }

  public getTemplate(id: string): BoardTemplateDTO | undefined {
    return this.templates.get(id);
  }

  public getDefaultTemplate(userIdentifier?: string): BoardTemplateDTO {
    if (userIdentifier) {
      const userTemplates = this.getUserTemplates(userIdentifier);
      if (userTemplates.length > 0) {
        // Return latest user template
        return userTemplates[userTemplates.length - 1];
      }
    }
    return this.templates.get(this.defaultTemplateId) || this.templates.get('default-expanded-48')!;
  }

  /**
   * Generate 6-char room code
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Create a new room with host player and chosen template
   */
  public createRoom(
    hostName: string, 
    avatar = 'token-1', 
    color = '#6366f1',
    customTemplate?: BoardTemplateDTO | { tiles?: BoardTileDTO[]; rewards?: RewardDTO[]; punishments?: PunishmentDTO[]; rules?: GameRulesDTO; id?: string; name?: string; description?: string } | string
  ): { room: RoomInstance; hostPlayer: PlayerDTO } {
    let code = this.generateRoomCode();
    while (this.rooms.has(code)) {
      code = this.generateRoomCode();
    }

    const hostSessionId = uuidv4();
    const hostPlayerId = uuidv4();

    let templateData: any = null;
    if (typeof customTemplate === 'string') {
      templateData = this.templates.get(customTemplate);
    } else if (customTemplate && typeof customTemplate === 'object') {
      templateData = customTemplate;
      if (customTemplate.tiles && Array.isArray(customTemplate.tiles) && customTemplate.tiles.length > 0) {
        const tplId = customTemplate.id || `tpl-${Date.now()}`;
        this.templates.set(tplId, {
          id: tplId,
          name: customTemplate.name || 'Custom Board',
          description: customTemplate.description || 'Host custom board',
          tiles: customTemplate.tiles,
          rewards: customTemplate.rewards || DEFAULT_REWARDS,
          punishments: customTemplate.punishments || DEFAULT_PUNISHMENTS,
          rules: customTemplate.rules || DEFAULT_RULES,
          updatedAt: new Date().toISOString()
        });
        this.persistTemplates();
      }
    }

    const defaultTemplate = this.templates.get(this.defaultTemplateId) || this.templates.get('default-expanded-48');
    const selectedTemplate = (templateData && templateData.tiles && templateData.tiles.length > 0) ? templateData : defaultTemplate;
    const rules = selectedTemplate?.rules ? { ...selectedTemplate.rules } : { ...DEFAULT_RULES };
    const boardTiles = selectedTemplate?.tiles ? JSON.parse(JSON.stringify(selectedTemplate.tiles)) : createDefault48Tiles();
    const rewards = selectedTemplate?.rewards ? JSON.parse(JSON.stringify(selectedTemplate.rewards)) : JSON.parse(JSON.stringify(DEFAULT_REWARDS));
    const punishments = selectedTemplate?.punishments ? JSON.parse(JSON.stringify(selectedTemplate.punishments)) : JSON.parse(JSON.stringify(DEFAULT_PUNISHMENTS));

    const hostPlayer: PlayerDTO = {
      id: hostPlayerId,
      sessionId: hostSessionId,
      name: hostName || 'Host Mogul',
      avatar: avatar || 'token-1',
      color: color || PLAYER_COLORS[0],
      isHost: true,
      isReady: true,
      money: rules.startingCash,
      position: 0,
      inJail: false,
      jailTurns: 0,
      isBankrupt: false,
      isConnected: true,
      orderIndex: 0,
      netWorth: rules.startingCash,
      propertyCount: 0
    };

    const room: RoomInstance = {
      id: uuidv4(),
      code,
      hostSessionId,
      status: 'LOBBY',
      currentTurnIdx: 0,
      currentRound: 1,
      actionStage: 'AWAITING_ROLL',
      activePlayerId: hostPlayerId,
      turnExpiresAt: null,
      dice: [1, 1],
      lastRollTotal: 2,
      winner: null,
      players: [hostPlayer],
      boardTiles,
      rewards,
      punishments,
      rules,
      transactions: [{
        id: uuidv4(),
        round: 1,
        playerId: hostPlayerId,
        playerName: hostPlayer.name,
        playerColor: hostPlayer.color,
        type: 'ROOM_CREATED',
        amount: 0,
        details: `Room ${code} created with ${boardTiles.length}-tile board by ${hostPlayer.name}`,
        timestamp: new Date().toISOString()
      }],
      activePopup: null,
      activeTrade: null,
      activeAuction: null,
      lastUpdated: Date.now()
    };

    this.rooms.set(code, room);
    this.sessionToRoom.set(hostSessionId, code);

    return { room, hostPlayer };
  }

  /**
   * Join an existing room
   */
  public joinRoom(
    code: string,
    playerName: string,
    avatar = 'token-2',
    color?: string,
    existingSessionId?: string
  ): { room: RoomInstance; player: PlayerDTO; isReconnect: boolean } {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) {
      throw new Error(`Room with code "${code}" not found.`);
    }

    // Check reconnection by session ID
    if (existingSessionId) {
      const existingPlayer = room.players.find(p => p.sessionId === existingSessionId);
      if (existingPlayer) {
        existingPlayer.isConnected = true;
        this.sessionToRoom.set(existingSessionId, code);
        return { room, player: existingPlayer, isReconnect: true };
      }
    }

    // Capacity limit: Max 6 players per room!
    if (room.players.length >= 6) {
      throw new Error('This room has reached the maximum capacity of 6 players.');
    }

    if (room.status !== 'LOBBY') {
      throw new Error('Game is already in progress and new players cannot join.');
    }

    const sessionId = existingSessionId || uuidv4();
    const playerId = uuidv4();
    const assignedColor = color || PLAYER_COLORS[room.players.length % PLAYER_COLORS.length];

    const newPlayer: PlayerDTO = {
      id: playerId,
      sessionId,
      name: playerName || `Player ${room.players.length + 1}`,
      avatar: avatar || `token-${room.players.length + 1}`,
      color: assignedColor,
      isHost: false,
      isReady: false,
      money: room.rules.startingCash,
      position: 0,
      inJail: false,
      jailTurns: 0,
      isBankrupt: false,
      isConnected: true,
      orderIndex: room.players.length,
      netWorth: room.rules.startingCash,
      propertyCount: 0
    };

    room.players.push(newPlayer);
    this.sessionToRoom.set(sessionId, code);

    this.addTransaction(room, {
      round: room.currentRound,
      playerId: newPlayer.id,
      playerName: newPlayer.name,
      playerColor: newPlayer.color,
      type: 'PLAYER_JOINED',
      amount: 0,
      details: `${newPlayer.name} joined the room (${room.players.length}/6)`
    });

    return { room, player: newPlayer, isReconnect: false };
  }

  public addBot(code: string, hostSessionId: string): RoomInstance {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Room not found');
    if (room.hostSessionId !== hostSessionId) {
      throw new Error('Only the host can add bots.');
    }
    if (room.players.length >= 6) {
      throw new Error('Room is full (max 6 players).');
    }
    if (room.status !== 'LOBBY') {
      throw new Error('Bots can only be added while in the lobby.');
    }

    const botCount = room.players.filter(p => p.isBot).length + 1;
    const botSessionId = `bot-${uuidv4()}`;
    const botId = `bot-${uuidv4()}`;
    const botColors = ['#f59e0b', '#ec4899', '#06b6d4', '#10b981', '#8b5cf6'];
    const botShapes = ['robot', 'cat', 'rocket', 'car', 'zap'];
    
    const assignedColor = botColors[botCount % botColors.length];
    const assignedShape = botShapes[botCount % botShapes.length];

    const botPlayer: PlayerDTO = {
      id: botId,
      sessionId: botSessionId,
      name: `AI Bot ${botCount}`,
      avatar: assignedShape,
      color: assignedColor,
      isHost: false,
      isReady: true,
      isBot: true,
      money: room.rules.startingCash,
      position: 0,
      inJail: false,
      jailTurns: 0,
      isBankrupt: false,
      isConnected: true,
      orderIndex: room.players.length,
      netWorth: room.rules.startingCash,
      propertyCount: 0
    };

    room.players.push(botPlayer);
    this.sessionToRoom.set(botSessionId, code.toUpperCase());

    this.addTransaction(room, {
      round: room.currentRound,
      playerId: botPlayer.id,
      playerName: botPlayer.name,
      playerColor: botPlayer.color,
      type: 'BOT_ADDED',
      amount: 0,
      details: `${botPlayer.name} joined the game.`
    });

    return room;
  }

  public removeBot(code: string, hostSessionId: string, botId?: string): RoomInstance {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Room not found');
    if (room.hostSessionId !== hostSessionId) {
      throw new Error('Only the host can remove bots.');
    }
    if (room.status !== 'LOBBY') {
      throw new Error('Bots can only be removed in lobby.');
    }

    let botIdx = -1;
    if (botId) {
      botIdx = room.players.findIndex(p => p.id === botId && p.isBot);
    } else {
      for (let i = room.players.length - 1; i >= 0; i--) {
        if (room.players[i].isBot) {
          botIdx = i;
          break;
        }
      }
    }

    if (botIdx === -1) {
      throw new Error('No bot found to remove.');
    }

    const removed = room.players.splice(botIdx, 1)[0];
    this.sessionToRoom.delete(removed.sessionId);
    room.players.forEach((p, idx) => { p.orderIndex = idx; });

    return room;
  }

  public getRoom(code: string): RoomInstance | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  public getRoomBySession(sessionId: string): RoomInstance | undefined {
    const code = this.sessionToRoom.get(sessionId);
    if (!code) return undefined;
    return this.rooms.get(code);
  }

  public setPlayerDisconnected(sessionId: string) {
    const code = this.sessionToRoom.get(sessionId);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room) return;
    const player = room.players.find(p => p.sessionId === sessionId);
    if (player) {
      player.isConnected = false;
      this.addTransaction(room, {
        round: room.currentRound,
        playerId: player.id,
        playerName: player.name,
        playerColor: player.color,
        type: 'PLAYER_DISCONNECTED',
        amount: 0,
        details: `${player.name} disconnected`
      });
    }
  }

  public toggleReady(code: string, sessionId: string): RoomInstance {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Room not found');
    const player = room.players.find(p => p.sessionId === sessionId);
    if (!player) throw new Error('Player not found');

    player.isReady = !player.isReady;
    return room;
  }

  public startGame(code: string, hostSessionId: string): RoomInstance {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Room not found');
    if (room.hostSessionId !== hostSessionId) {
      throw new Error('Only the room host can start the game.');
    }
    if (room.players.length < 1) {
      throw new Error('At least 1 player is required to start.');
    }

    room.status = 'PLAYING';
    room.currentRound = 1;
    room.currentTurnIdx = 0;
    room.activePlayerId = room.players[0].id;
    room.actionStage = 'AWAITING_ROLL';
    room.activePopup = null;
    room.activeTrade = null;
    room.activeAuction = null;

    room.players.forEach((p, idx) => {
      p.money = room.rules.startingCash;
      p.position = 0;
      p.inJail = false;
      p.jailTurns = 0;
      p.isBankrupt = false;
      p.orderIndex = idx;
      p.netWorth = room.rules.startingCash;
      p.propertyCount = 0;
    });

    this.addTransaction(room, {
      round: 1,
      playerId: room.players[0].id,
      playerName: room.players[0].name,
      playerColor: room.players[0].color,
      type: 'GAME_STARTED',
      amount: 0,
      details: `Game started! Round 1 begins with ${room.players[0].name}'s turn.`
    });

    return room;
  }

  /**
   * Roll dice for active player
   */
  public rollDice(code: string, sessionId: string): RoomInstance {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Room not found');
    if (room.status !== 'PLAYING') throw new Error('Game is not currently active');

    const activePlayer = room.players[room.currentTurnIdx];
    if (!activePlayer || activePlayer.sessionId !== sessionId) {
      throw new Error('It is not your turn to roll the dice.');
    }
    if (room.actionStage !== 'AWAITING_ROLL') {
      throw new Error('Dice already rolled for this turn.');
    }

    // Roll dice with crypto random
    const roll = GameEngine.rollDice(room.rules);
    room.dice = [roll.dice1, roll.dice2];
    room.lastRollTotal = roll.total;

    // Handle Jail condition
    if (activePlayer.inJail) {
      if (roll.isDouble) {
        activePlayer.inJail = false;
        activePlayer.jailTurns = 0;
        this.addTransaction(room, {
          round: room.currentRound,
          playerId: activePlayer.id,
          playerName: activePlayer.name,
          playerColor: activePlayer.color,
          type: 'JAIL_FREE',
          amount: 0,
          details: `${activePlayer.name} rolled doubles (${roll.dice1}-${roll.dice2}) and broke out of Jail!`
        });
        room.activePopup = {
          id: uuidv4(),
          type: 'ANNOUNCEMENT',
          title: '🎉 Doubles Rolled! Escaped Jail!',
          description: `You rolled doubles (${roll.dice1} & ${roll.dice2}) and escaped from Jail! You advance ${roll.total} spaces!`
        };
      } else {
        activePlayer.jailTurns = Math.max(0, (activePlayer.jailTurns || 1) - 1);
        const freeNext = activePlayer.jailTurns === 0;
        if (freeNext) {
          activePlayer.inJail = false;
        }
        this.addTransaction(room, {
          round: room.currentRound,
          playerId: activePlayer.id,
          playerName: activePlayer.name,
          playerColor: activePlayer.color,
          type: 'JAIL_WAIT',
          amount: 0,
          details: `${activePlayer.name} rolled ${roll.dice1}+${roll.dice2} (no doubles) and remains in Jail.`
        });
        room.activePopup = {
          id: uuidv4(),
          type: 'JAIL',
          title: freeNext ? 'Detention Sentence Complete' : '🔒 Turn Missed (In Jail)',
          description: freeNext
            ? `You rolled ${roll.dice1} + ${roll.dice2} = ${roll.total} (no doubles). Your sentence is finished, and you are free to move next turn!`
            : `You rolled ${roll.dice1} + ${roll.dice2} = ${roll.total} (no doubles). You must miss this turn and remain locked in Jail (${activePlayer.jailTurns} turn left)!`
        };
        room.actionStage = 'AWAITING_END_TURN';
        return room;
      }
    }

    // Calculate movement with wraparound & start bonus
    const { newPos, passedStart, bonusAmount } = GameEngine.calculateMovement(
      activePlayer.position,
      roll.total,
      room.boardTiles.length,
      room.rules
    );

    activePlayer.position = newPos;

    if (passedStart && bonusAmount > 0) {
      activePlayer.money += bonusAmount;
      this.addTransaction(room, {
        round: room.currentRound,
        playerId: activePlayer.id,
        playerName: activePlayer.name,
        playerColor: activePlayer.color,
        type: 'PASS_START',
        amount: bonusAmount,
        details: `${activePlayer.name} passed START and collected ₹${bonusAmount}`
      });
    }

    // Landed tile resolution
    const landedTile = room.boardTiles[newPos];
    const landing = GameEngine.resolveLanding(
      activePlayer,
      landedTile,
      room.boardTiles,
      room.players,
      room.rewards,
      room.punishments,
      room.rules
    );

    // Apply player delta
    Object.assign(activePlayer, landing.playerDelta);

    // Apply other player deltas
    landing.otherPlayersDelta.forEach(d => {
      const p = room.players.find(pl => pl.id === d.id);
      if (p) p.money += d.deltaMoney;
    });

    room.actionStage = landing.stage;
    room.activePopup = landing.popup || null;

    this.addTransaction(room, landing.transaction);

    // Handle secondary movement (e.g. from reward/punishment)
    if (landing.secondaryMovement && landing.secondaryMovement !== 0) {
      const secondary = GameEngine.calculateMovement(
        activePlayer.position,
        landing.secondaryMovement,
        room.boardTiles.length,
        room.rules
      );
      activePlayer.position = secondary.newPos;
    }

    this.updateStats(room);
    this.checkBankruptcyAndSurvivor(room);

    return room;
  }

  /**
   * Buy landed property
   */
  public buyProperty(code: string, sessionId: string): RoomInstance {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Room not found');
    const player = room.players[room.currentTurnIdx];
    if (!player || player.sessionId !== sessionId) throw new Error('Not your turn.');
    if (room.actionStage !== 'AWAITING_BUY_DECISION') throw new Error('No buy decision pending.');

    const tile = room.boardTiles[player.position];
    if (!tile || tile.type !== 'PROPERTY' || tile.ownerId) throw new Error('Property not available for purchase.');

    if (player.money < tile.price) {
      throw new Error(`Insufficient funds (₹${player.money}) to buy ${tile.name} (₹${tile.price}).`);
    }

    player.money -= tile.price;
    tile.ownerId = player.id;
    tile.upgradeLevel = 0;
    tile.isMortgaged = false;
    player.propertyCount++;

    room.actionStage = 'AWAITING_END_TURN';
    room.activePopup = null;

    this.addTransaction(room, {
      round: room.currentRound,
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      type: 'BUY_PROPERTY',
      amount: -tile.price,
      details: `${player.name} bought ${tile.name} for ₹${tile.price}`
    });

    this.updateStats(room);
    return room;
  }

  /**
   * Skip purchase -> Triggers RichUp.io AUCTION among all players!
   */
  public skipPurchase(code: string, sessionId: string): RoomInstance {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Room not found');
    const player = room.players[room.currentTurnIdx];
    if (!player || player.sessionId !== sessionId) throw new Error('Not your turn.');

    room.activePopup = null;
    const tile = room.boardTiles[player.position];

    this.addTransaction(room, {
      round: room.currentRound,
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      type: 'SKIP_BUY',
      amount: 0,
      details: `${player.name} passed on ${tile?.name || 'property'}. Property goes to live Auction!`
    });

    // Start RichUp.io Auction!
    if (tile && tile.type === 'PROPERTY' && !tile.ownerId) {
      this.startAuction(room, tile);
    } else {
      room.actionStage = 'AWAITING_END_TURN';
    }

    return room;
  }

  /**
   * Pay bail to immediately escape Jail and proceed to roll dice
   */
  public payBail(code: string, sessionId: string): RoomInstance {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Room not found');
    const player = room.players[room.currentTurnIdx];
    if (!player || player.sessionId !== sessionId) throw new Error('Not your turn.');
    if (!player.inJail) throw new Error('You are not in jail.');
    if (room.actionStage !== 'AWAITING_ROLL') throw new Error('Cannot pay bail right now.');

    const bailAmount = 50;
    player.money = Math.max(0, (player.money || 0) - bailAmount);
    player.inJail = false;
    player.jailTurns = 0;

    this.addTransaction(room, {
      round: room.currentRound,
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      type: 'PAY_BAIL',
      amount: -bailAmount,
      details: `${player.name} paid ₹${bailAmount} bail and was released from Jail!`
    });

    room.activePopup = {
      id: uuidv4(),
      type: 'ANNOUNCEMENT',
      title: '🔓 Released from Jail!',
      description: `You paid ₹${bailAmount} bail and are released from detention! Roll the dice to move.`
    };

    this.updateStats(room);
    return room;
  }

  /**
   * Start Live Property Auction (RichUp.io feature)
   */
  private startAuction(room: RoomInstance, tile: BoardTileDTO) {
    if (room.auctionTimer) {
      clearInterval(room.auctionTimer);
    }

    const startBid = Math.max(10, Math.round(tile.price * 0.4));
    room.activeAuction = {
      id: uuidv4(),
      tileId: tile.id,
      tileName: tile.name,
      tilePrice: tile.price,
      currentBid: startBid,
      highestBidderId: null,
      highestBidderName: null,
      timeRemainingSec: 15,
      active: true
    };
    room.actionStage = 'AUCTION_ACTIVE';

    this.addTransaction(room, {
      round: room.currentRound,
      type: 'AUCTION_START',
      amount: startBid,
      details: `Auction started for ${tile.name}! Opening bid: ₹${startBid}. Bidding is open to all players!`
    });
  }

  /**
   * Place bid in active auction (RichUp.io feature)
   */
  public placeBid(code: string, sessionId: string, bidAmount: number): RoomInstance {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Room not found');
    if (!room.activeAuction || !room.activeAuction.active) throw new Error('No auction active');

    const player = room.players.find(p => p.sessionId === sessionId);
    if (!player) throw new Error('Player not found');
    if (player.isBankrupt) throw new Error('Bankrupt players cannot bid');
    if (player.money < bidAmount) throw new Error(`You only have ₹${player.money}. Bid of ₹${bidAmount} is too high.`);
    if (bidAmount <= room.activeAuction.currentBid) throw new Error(`Bid must exceed current bid of ₹${room.activeAuction.currentBid}`);

    room.activeAuction.currentBid = bidAmount;
    room.activeAuction.highestBidderId = player.id;
    room.activeAuction.highestBidderName = player.name;
    // Anti-snipe: extend timer by 5 seconds if < 5s remain
    if (room.activeAuction.timeRemainingSec < 5) {
      room.activeAuction.timeRemainingSec = 5;
    }

    this.addTransaction(room, {
      round: room.currentRound,
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      type: 'AUCTION_BID',
      amount: bidAmount,
      details: `${player.name} bid ₹${bidAmount} for ${room.activeAuction.tileName}`
    });

    return room;
  }

  /**
   * End active auction and award property (RichUp.io feature)
   */
  public finishAuction(code: string): RoomInstance {
    const room = this.rooms.get(code.toUpperCase());
    if (!room || !room.activeAuction) return room!;

    const auction = room.activeAuction;
    const tile = room.boardTiles.find(t => t.id === auction.tileId);

    if (tile && auction.highestBidderId) {
      const winner = room.players.find(p => p.id === auction.highestBidderId);
      if (winner && winner.money >= auction.currentBid) {
        winner.money -= auction.currentBid;
        tile.ownerId = winner.id;
        tile.upgradeLevel = 0;
        tile.isMortgaged = false;
        winner.propertyCount++;

        this.addTransaction(room, {
          round: room.currentRound,
          playerId: winner.id,
          playerName: winner.name,
          playerColor: winner.color,
          type: 'AUCTION_WON',
          amount: -auction.currentBid,
          details: `${winner.name} won the auction for ${tile.name} for ₹${auction.currentBid}!`
        });
      }
    } else {
      this.addTransaction(room, {
        round: room.currentRound,
        type: 'AUCTION_PASSED',
        amount: 0,
        details: `Auction ended with no bids for ${auction.tileName}. Property remains with the bank.`
      });
    }

    room.activeAuction = null;
    room.actionStage = 'AWAITING_END_TURN';
    this.updateStats(room);
    return room;
  }

  /**
   * Player-to-Player Trading: Propose Trade (RichUp.io feature)
   */
  public proposeTrade(
    code: string,
    sessionId: string,
    toPlayerId: string,
    offeredMoney: number,
    offeredTileIds: string[],
    requestedMoney: number,
    requestedTileIds: string[]
  ): RoomInstance {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Room not found');

    const fromPlayer = room.players.find(p => p.sessionId === sessionId);
    const toPlayer = room.players.find(p => p.id === toPlayerId);

    if (!fromPlayer || !toPlayer) throw new Error('Invalid players for trade');
    if (fromPlayer.id === toPlayer.id) throw new Error('Cannot trade with yourself');
    if (fromPlayer.isBankrupt || toPlayer.isBankrupt) throw new Error('Bankrupt players cannot trade');

    if (fromPlayer.money < offeredMoney) throw new Error(`You only have ₹${fromPlayer.money}`);
    if (toPlayer.money < requestedMoney) throw new Error(`${toPlayer.name} only has ₹${toPlayer.money}`);

    // Verify ownership
    for (const tId of offeredTileIds) {
      const tile = room.boardTiles.find(t => t.id === tId);
      if (!tile || tile.ownerId !== fromPlayer.id) throw new Error('You do not own all offered properties');
    }

    for (const tId of requestedTileIds) {
      const tile = room.boardTiles.find(t => t.id === tId);
      if (!tile || tile.ownerId !== toPlayer.id) throw new Error(`${toPlayer.name} does not own all requested properties`);
    }

    room.activeTrade = {
      id: uuidv4(),
      fromPlayerId: fromPlayer.id,
      fromPlayerName: fromPlayer.name,
      toPlayerId: toPlayer.id,
      toPlayerName: toPlayer.name,
      offeredMoney,
      offeredTileIds,
      requestedMoney,
      requestedTileIds,
      status: 'PENDING',
      createdAt: Date.now()
    };

    this.addTransaction(room, {
      round: room.currentRound,
      playerId: fromPlayer.id,
      playerName: fromPlayer.name,
      playerColor: fromPlayer.color,
      type: 'TRADE_PROPOSED',
      amount: 0,
      details: `${fromPlayer.name} proposed a trade deal to ${toPlayer.name}`
    });

    return room;
  }

  /**
   * Respond to Trade Proposal (Accept or Decline)
   */
  public respondTrade(code: string, sessionId: string, accept: boolean): RoomInstance {
    const room = this.rooms.get(code.toUpperCase());
    if (!room || !room.activeTrade) throw new Error('No trade proposal active');

    const respondingPlayer = room.players.find(p => p.sessionId === sessionId);
    if (!respondingPlayer || respondingPlayer.id !== room.activeTrade.toPlayerId) {
      throw new Error('Only the recipient can respond to this trade proposal');
    }

    const trade = room.activeTrade;
    const fromPlayer = room.players.find(p => p.id === trade.fromPlayerId);
    const toPlayer = room.players.find(p => p.id === trade.toPlayerId);

    if (accept && fromPlayer && toPlayer) {
      // Execute atomic transfer
      fromPlayer.money = fromPlayer.money - trade.offeredMoney + trade.requestedMoney;
      toPlayer.money = toPlayer.money - trade.requestedMoney + trade.offeredMoney;

      // Transfer offered tiles
      trade.offeredTileIds.forEach(tId => {
        const tile = room.boardTiles.find(t => t.id === tId);
        if (tile) tile.ownerId = toPlayer.id;
      });

      // Transfer requested tiles
      trade.requestedTileIds.forEach(tId => {
        const tile = room.boardTiles.find(t => t.id === tId);
        if (tile) tile.ownerId = fromPlayer.id;
      });

      this.addTransaction(room, {
        round: room.currentRound,
        playerId: toPlayer.id,
        playerName: toPlayer.name,
        playerColor: toPlayer.color,
        type: 'TRADE_ACCEPTED',
        amount: 0,
        details: `${toPlayer.name} accepted the trade proposal from ${fromPlayer.name}!`
      });
    } else if (fromPlayer && toPlayer) {
      this.addTransaction(room, {
        round: room.currentRound,
        playerId: toPlayer.id,
        playerName: toPlayer.name,
        playerColor: toPlayer.color,
        type: 'TRADE_DECLINED',
        amount: 0,
        details: `${toPlayer.name} declined the trade proposal from ${fromPlayer.name}.`
      });
    }

    room.activeTrade = null;
    this.updateStats(room);
    return room;
  }

  /**
   * Cancel active trade proposal
   */
  public cancelTrade(code: string, sessionId: string): RoomInstance {
    const room = this.rooms.get(code.toUpperCase());
    if (!room || !room.activeTrade) return room!;

    const player = room.players.find(p => p.sessionId === sessionId);
    if (player && (player.id === room.activeTrade.fromPlayerId || player.id === room.activeTrade.toPlayerId)) {
      room.activeTrade = null;
    }
    return room;
  }

  /**
   * Mortgage Property for emergency cash (RichUp.io feature)
   */
  public mortgageProperty(code: string, sessionId: string, tileId: string): RoomInstance {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Room not found');

    const player = room.players.find(p => p.sessionId === sessionId);
    if (!player) throw new Error('Player not found');

    const tile = room.boardTiles.find(t => t.id === tileId);
    if (!tile || tile.ownerId !== player.id) throw new Error('You do not own this property');
    if (tile.isMortgaged) throw new Error('Property is already mortgaged');
    if ((tile.upgradeLevel || 0) > 0) throw new Error('Sell upgrades before mortgaging');

    const cashGained = Math.round(tile.price * 0.5);
    tile.isMortgaged = true;
    player.money += cashGained;

    this.addTransaction(room, {
      round: room.currentRound,
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      type: 'MORTGAGE',
      amount: cashGained,
      details: `${player.name} mortgaged ${tile.name} to the bank and received ₹${cashGained}`
    });

    this.updateStats(room);
    return room;
  }

  /**
   * Unmortgage Property (RichUp.io feature)
   */
  public unmortgageProperty(code: string, sessionId: string, tileId: string): RoomInstance {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Room not found');

    const player = room.players.find(p => p.sessionId === sessionId);
    if (!player) throw new Error('Player not found');

    const tile = room.boardTiles.find(t => t.id === tileId);
    if (!tile || tile.ownerId !== player.id) throw new Error('You do not own this property');
    if (!tile.isMortgaged) throw new Error('Property is not mortgaged');

    const cost = Math.round(tile.price * 0.55); // 50% + 10% fee
    if (player.money < cost) throw new Error(`Insufficient funds (₹${cost}) to unmortgage`);

    player.money -= cost;
    tile.isMortgaged = false;

    this.addTransaction(room, {
      round: room.currentRound,
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      type: 'UNMORTGAGE',
      amount: -cost,
      details: `${player.name} unmortgaged ${tile.name} for ₹${cost}`
    });

    this.updateStats(room);
    return room;
  }

  /**
   * Sell Property back to Bank or sell house/upgrade (RichUp.io / Monopoly feature)
   */
  public sellProperty(code: string, sessionId: string, tileId: string): RoomInstance {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Room not found');

    const player = room.players.find(p => p.sessionId === sessionId);
    if (!player) throw new Error('Player not found');
    if (player.isBankrupt) throw new Error('Bankrupt players cannot sell');

    const tile = room.boardTiles.find(t => t.id === tileId);
    if (!tile || tile.ownerId !== player.id) throw new Error('You do not own this property');

    // Case 1: If upgraded, sell 1 upgrade level for 50% refund
    if ((tile.upgradeLevel || 0) > 0) {
      const upgradeCost = tile.upgradeCost || 100;
      const refund = Math.round(upgradeCost * 0.5);
      tile.upgradeLevel = (tile.upgradeLevel || 0) - 1;
      player.money = Number(player.money || 0) + refund;

      this.addTransaction(room, {
        round: room.currentRound,
        playerId: player.id,
        playerName: player.name,
        playerColor: player.color,
        type: 'SELL_UPGRADE',
        amount: refund,
        details: `${player.name} sold an upgrade tier on ${tile.name} and collected ₹${refund} cash!`
      });

      this.updateStats(room);
      return room;
    }

    // Case 2: Sell property back to Bank
    // If mortgaged: 25% cash; if unmortgaged: full purchase price refund
    const refund = tile.isMortgaged ? Math.round(tile.price * 0.25) : tile.price;
    tile.ownerId = null;
    tile.upgradeLevel = 0;
    tile.isMortgaged = false;
    player.propertyCount = Math.max(0, (player.propertyCount || 1) - 1);
    player.money = Number(player.money || 0) + refund;

    this.addTransaction(room, {
      round: room.currentRound,
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      type: 'SELL_PROPERTY',
      amount: refund,
      details: `${player.name} sold ${tile.name} back to the bank and collected ₹${refund} cash!`
    });

    this.updateStats(room);
    return room;
  }

  /**
   * Declare Bankruptcy (RichUp.io feature)
   */
  public declareBankruptcy(code: string, sessionId: string): RoomInstance {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Room not found');

    const player = room.players.find(p => p.sessionId === sessionId);
    if (!player) throw new Error('Player not found');

    player.isBankrupt = true;
    player.money = 0;

    // Return all properties to bank
    room.boardTiles.forEach(t => {
      if (t.ownerId === player.id) {
        t.ownerId = null;
        t.upgradeLevel = 0;
        t.isMortgaged = false;
      }
    });

    this.addTransaction(room, {
      round: room.currentRound,
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      type: 'BANKRUPTCY',
      amount: 0,
      details: `${player.name} declared bankruptcy! All properties returned to the bank.`
    });

    // Advance turn if active player
    if (room.activePlayerId === player.id) {
      this.endTurn(code, sessionId);
    } else {
      this.checkBankruptcyAndSurvivor(room);
    }

    this.updateStats(room);
    return room;
  }

  /**
   * Upgrade property
   */
  public upgradeProperty(code: string, sessionId: string, tileId: string): RoomInstance {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Room not found');
    const player = room.players.find(p => p.sessionId === sessionId);
    if (!player) throw new Error('Player not found');

    const tile = room.boardTiles.find(t => t.id === tileId);
    if (!tile || tile.ownerId !== player.id) throw new Error('You do not own this property');
    if (tile.isMortgaged) throw new Error('Cannot upgrade mortgaged property');

    const cost = tile.upgradeCost || 100;
    if (player.money < cost) throw new Error('Insufficient funds to upgrade');
    if ((tile.upgradeLevel || 0) >= 3) throw new Error('Property already at maximum upgrade tier');

    // Rule: Must own all properties of this color category to build houses/hotels
    if (tile.colorGroup) {
      const groupProperties = room.boardTiles.filter(t => t.type === 'PROPERTY' && t.colorGroup === tile.colorGroup);
      const allOwnedByPlayer = groupProperties.length > 0 && groupProperties.every(t => t.ownerId === player.id);
      if (!allOwnedByPlayer) {
        throw new Error(`You must own all ${groupProperties.length} properties in the ${tile.district || 'color'} group to develop houses or hotels!`);
      }
      const anyMortgaged = groupProperties.some(t => t.isMortgaged);
      if (anyMortgaged) {
        throw new Error('Cannot develop properties while any property in the group is mortgaged!');
      }
    }

    player.money -= cost;
    tile.upgradeLevel = (tile.upgradeLevel || 0) + 1;

    this.addTransaction(room, {
      round: room.currentRound,
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      type: 'UPGRADE_PROPERTY',
      amount: -cost,
      details: `${player.name} developed ${tile.name} to Tier ${tile.upgradeLevel} for ₹${cost}`
    });

    this.updateStats(room);
    return room;
  }

  /**
   * End current player turn and advance to next active player
   */
  public endTurn(code: string, sessionId: string): RoomInstance {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Room not found');
    const player = room.players[room.currentTurnIdx];
    if (!player || player.sessionId !== sessionId) throw new Error('Not your turn.');

    room.activePopup = null;
    room.activeAuction = null;

    const totalPlayers = room.players.length;
    let nextIdx = (room.currentTurnIdx + 1) % totalPlayers;
    let loopCount = 0;

    while (room.players[nextIdx].isBankrupt && loopCount < totalPlayers) {
      nextIdx = (nextIdx + 1) % totalPlayers;
      loopCount++;
    }

    if (nextIdx <= room.currentTurnIdx) {
      room.currentRound++;
    }

    room.currentTurnIdx = nextIdx;
    room.activePlayerId = room.players[nextIdx].id;
    room.actionStage = 'AWAITING_ROLL';

    this.checkBankruptcyAndSurvivor(room);

    if (room.currentRound > room.rules.maxRounds) {
      this.finishGameByNetWorth(room);
    }

    return room;
  }

  private checkBankruptcyAndSurvivor(room: RoomInstance) {
    const activeSurvivors = room.players.filter(p => !p.isBankrupt);

    if (activeSurvivors.length === 1 && room.players.length > 1) {
      room.status = 'FINISHED';
      room.winner = activeSurvivors[0];
      room.actionStage = 'GAME_OVER';
      this.addTransaction(room, {
        round: room.currentRound,
        playerId: room.winner.id,
        playerName: room.winner.name,
        playerColor: room.winner.color,
        type: 'VICTORY',
        amount: 0,
        details: `Game Over! ${room.winner.name} is the sole survivor and wins the game!`
      });
    }
  }

  private finishGameByNetWorth(room: RoomInstance) {
    room.status = 'FINISHED';
    room.actionStage = 'GAME_OVER';

    let maxWorth = -1;
    let topPlayer: PlayerDTO | null = null;

    room.players.forEach(p => {
      if (!p.isBankrupt && p.netWorth > maxWorth) {
        maxWorth = p.netWorth;
        topPlayer = p;
      }
    });

    const winningPlayer = topPlayer as PlayerDTO | null;
    room.winner = winningPlayer;
    if (winningPlayer) {
      this.addTransaction(room, {
        round: room.currentRound,
        playerId: winningPlayer.id,
        playerName: winningPlayer.name,
        playerColor: winningPlayer.color,
        type: 'VICTORY',
        amount: 0,
        details: `Max rounds (${room.rules.maxRounds}) reached! ${winningPlayer.name} wins with net worth ₹${maxWorth}!`
      });
    }
  }

  private updateStats(room: RoomInstance) {
    room.players.forEach(p => {
      const owned = room.boardTiles.filter(t => t.ownerId === p.id);
      p.propertyCount = owned.length;
      p.netWorth = GameEngine.calculateNetWorth(p, room.boardTiles);
    });
  }

  private addTransaction(room: RoomInstance, tx: Omit<GameTransactionDTO, 'id' | 'timestamp'>) {
    room.transactions.unshift({
      id: uuidv4(),
      ...tx,
      timestamp: new Date().toISOString()
    });
    if (room.transactions.length > 100) {
      room.transactions.pop();
    }
    room.lastUpdated = Date.now();
  }

  public updateBoardTiles(code: string, hostSessionId: string, tiles: BoardTileDTO[]): RoomInstance {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Room not found');
    if (room.hostSessionId !== hostSessionId) throw new Error('Unauthorized: Host only');

    tiles.forEach((t, i) => {
      t.index = i;
    });

    room.boardTiles = tiles;
    this.updateStats(room);
    return room;
  }

  public updateRewards(code: string, hostSessionId: string, rewards: RewardDTO[]): RoomInstance {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Room not found');
    if (room.hostSessionId !== hostSessionId) throw new Error('Unauthorized: Host only');

    room.rewards = rewards;
    return room;
  }

  public updatePunishments(code: string, hostSessionId: string, punishments: PunishmentDTO[]): RoomInstance {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Room not found');
    if (room.hostSessionId !== hostSessionId) throw new Error('Unauthorized: Host only');

    room.punishments = punishments;
    return room;
  }

  public updateGameRules(code: string, hostSessionId: string, rules: GameRulesDTO): RoomInstance {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Room not found');
    if (room.hostSessionId !== hostSessionId) throw new Error('Unauthorized: Host only');

    room.rules = rules;
    return room;
  }

  public getPublicState(room: RoomInstance): PublicGameState {
    return {
      roomCode: room.code,
      status: room.status,
      currentTurnIdx: room.currentTurnIdx,
      currentRound: room.currentRound,
      actionStage: room.actionStage,
      activePlayerId: room.activePlayerId,
      turnExpiresAt: room.turnExpiresAt,
      dice: room.dice,
      lastRollTotal: room.lastRollTotal,
      winner: room.winner,
      players: room.players,
      boardTiles: room.boardTiles,
      rewards: room.rewards,
      punishments: room.punishments,
      rules: room.rules,
      transactions: room.transactions,
      activePopup: room.activePopup,
      activeTrade: room.activeTrade,
      activeAuction: room.activeAuction
    };
  }
}
