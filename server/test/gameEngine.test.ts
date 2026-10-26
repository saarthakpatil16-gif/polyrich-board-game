import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/engine/GameEngine.js';
import { createDefault48Tiles, DEFAULT_RULES, DEFAULT_REWARDS, DEFAULT_PUNISHMENTS } from '../src/engine/defaultBoard.js';
import { RoomManager } from '../src/services/roomManager.js';
import { PlayerDTO, BoardTileDTO } from '../src/types/game.js';

describe('1. Board Configuration & Expanded Tiles (+8 tiles)', () => {
  it('should initialize board with 48 tiles (4 corners + 44 intermediate tiles)', () => {
    const tiles = createDefault48Tiles();
    expect(tiles.length).toBe(48);

    // Verify 4 corners are placed at exact corner intervals
    expect(tiles[0].type).toBe('START');
    expect(tiles[12].type).toBe('JAIL');
    expect(tiles[24].type).toBe('BONUS');
    expect(tiles[36].type).toBe('MOVE_TO');
  });

  it('should have sequential, stable indexing 0 through 47', () => {
    const tiles = createDefault48Tiles();
    tiles.forEach((tile, index) => {
      expect(tile.index).toBe(index);
      expect(tile.id).toBeDefined();
    });
  });
});

describe('2. Movement and Wraparound Mechanics', () => {
  it('should correctly move within the board without wraparound', () => {
    const { newPos, passedStart, bonusAmount } = GameEngine.calculateMovement(5, 4, 48, DEFAULT_RULES);
    expect(newPos).toBe(9);
    expect(passedStart).toBe(false);
    expect(bonusAmount).toBe(0);
  });

  it('should wrap around the board and award pass-start bonus', () => {
    const { newPos, passedStart, bonusAmount } = GameEngine.calculateMovement(45, 5, 48, DEFAULT_RULES);
    expect(newPos).toBe(2);
    expect(passedStart).toBe(true);
    expect(bonusAmount).toBe(DEFAULT_RULES.passStartBonus);
  });

  it('should handle exact landing on START (index 0)', () => {
    const { newPos, passedStart, bonusAmount } = GameEngine.calculateMovement(44, 4, 48, DEFAULT_RULES);
    expect(newPos).toBe(0);
    expect(passedStart).toBe(true);
    expect(bonusAmount).toBe(DEFAULT_RULES.passStartBonus);
  });
});

describe('3. Rent Calculations & Upgrade Tiers', () => {
  const sampleTile: BoardTileDTO = {
    id: 'tile-sample',
    index: 1,
    name: 'Metropolis Tower',
    type: 'PROPERTY',
    colorGroup: '#0284c7',
    district: 'Financial',
    imageFit: 'cover',
    price: 300,
    baseRent: 30,
    rentLevel1: 75,
    rentLevel2: 150,
    rentLevel3: 300,
    upgradeCost: 150,
    canBuy: true,
    canTrade: true,
    isEnabled: true,
    ownerId: 'player-owner-1',
    upgradeLevel: 0
  };

  it('should return base rent for unimproved single property', () => {
    const rent = GameEngine.calculateRent(sampleTile, [sampleTile]);
    expect(rent).toBe(30);
  });

  it('should double rent when owner owns full color group (monopoly)', () => {
    const tile2: BoardTileDTO = { ...sampleTile, id: 'tile-sample-2', index: 3 };
    const rent = GameEngine.calculateRent(sampleTile, [sampleTile, tile2]);
    expect(rent).toBe(60); // 30 * 2
  });

  it('should calculate correct rent for upgraded tiers', () => {
    const tier1Tile = { ...sampleTile, upgradeLevel: 1 };
    expect(GameEngine.calculateRent(tier1Tile, [tier1Tile])).toBe(75);

    const tier2Tile = { ...sampleTile, upgradeLevel: 2 };
    expect(GameEngine.calculateRent(tier2Tile, [tier2Tile])).toBe(150);

    const tier3Tile = { ...sampleTile, upgradeLevel: 3 };
    expect(GameEngine.calculateRent(tier3Tile, [tier3Tile])).toBe(300);
  });
});

describe('4. Rewards & Punishments Engine', () => {
  it('should award money and handle bonus turn reward', () => {
    const player: PlayerDTO = {
      id: 'p1',
      sessionId: 's1',
      name: 'Alice',
      avatar: 'token-1',
      color: '#6366f1',
      isHost: true,
      isReady: true,
      money: 1000,
      position: 7,
      inJail: false,
      jailTurns: 0,
      isBankrupt: false,
      isConnected: true,
      orderIndex: 0,
      netWorth: 1000,
      propertyCount: 0
    };

    const rewardTile: BoardTileDTO = {
      id: 'tile-rew',
      index: 7,
      name: 'Lucky Chest',
      type: 'REWARD',
      rewardId: 'rew-angel-invest',
      imageFit: 'cover',
      price: 0,
      baseRent: 0,
      rentLevel1: 0,
      rentLevel2: 0,
      rentLevel3: 0,
      upgradeCost: 0,
      canBuy: false,
      canTrade: false,
      isEnabled: true
    };

    const landing = GameEngine.resolveLanding(
      player,
      rewardTile,
      [rewardTile],
      [player],
      DEFAULT_REWARDS,
      DEFAULT_PUNISHMENTS,
      DEFAULT_RULES
    );

    expect(landing.playerDelta.money).toBe(1000 + 250); // Angel investment = 250
    expect(landing.transaction.type).toBe('REWARD');
  });

  it('should deduct fine for punishment and handle next player recipient', () => {
    const p1: PlayerDTO = {
      id: 'p1',
      sessionId: 's1',
      name: 'Alice',
      avatar: 'token-1',
      color: '#6366f1',
      isHost: true,
      isReady: true,
      money: 1000,
      position: 47,
      inJail: false,
      jailTurns: 0,
      isBankrupt: false,
      isConnected: true,
      orderIndex: 0,
      netWorth: 1000,
      propertyCount: 0
    };

    const p2: PlayerDTO = { ...p1, id: 'p2', sessionId: 's2', name: 'Bob', money: 1000 };

    const punishTile: BoardTileDTO = {
      id: 'tile-pun',
      index: 47,
      name: 'Charity Benefit',
      type: 'PUNISHMENT',
      punishmentId: 'pun-tip-next',
      imageFit: 'cover',
      price: 0,
      baseRent: 0,
      rentLevel1: 0,
      rentLevel2: 0,
      rentLevel3: 0,
      upgradeCost: 0,
      canBuy: false,
      canTrade: false,
      isEnabled: true
    };

    const landing = GameEngine.resolveLanding(
      p1,
      punishTile,
      [punishTile],
      [p1, p2],
      DEFAULT_REWARDS,
      DEFAULT_PUNISHMENTS,
      DEFAULT_RULES
    );

    expect(landing.playerDelta.money).toBe(1000 - 75);
    expect(landing.otherPlayersDelta[0].id).toBe('p2');
    expect(landing.otherPlayersDelta[0].deltaMoney).toBe(75);
  });
});

describe('5. Multiplayer Room Capacity (Max 6 Players) & Turns', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = RoomManager.getInstance();
  });

  it('should enforce max 6 players per room', () => {
    const { room } = roomManager.createRoom('Host Alice');
    const code = room.code;

    // Join 5 additional players (total 6)
    for (let i = 2; i <= 6; i++) {
      const result = roomManager.joinRoom(code, `Player ${i}`);
      expect(result.player).toBeDefined();
    }

    expect(room.players.length).toBe(6);

    // 7th player must be rejected
    expect(() => {
      roomManager.joinRoom(code, 'Player 7');
    }).toThrow('This room has reached the maximum capacity of 6 players.');
  });

  it('should support reconnection with existing session ID', () => {
    const { room, hostPlayer } = roomManager.createRoom('Host Alice');
    const code = room.code;

    // Simulate reconnect
    const reconnected = roomManager.joinRoom(code, 'Host Alice', 'token-1', undefined, hostPlayer.sessionId);
    expect(reconnected.isReconnect).toBe(true);
    expect(reconnected.player.id).toBe(hostPlayer.id);
    expect(room.players.length).toBe(1); // Didn't duplicate
  });

  it('should prevent non-host from modifying board tiles', () => {
    const { room, hostPlayer } = roomManager.createRoom('Host Alice');
    const guestResult = roomManager.joinRoom(room.code, 'Guest Bob');

    expect(() => {
      roomManager.updateBoardTiles(room.code, guestResult.player.sessionId, []);
    }).toThrow('Unauthorized: Host only');

    // Host can update
    const updated = roomManager.updateBoardTiles(room.code, hostPlayer.sessionId, createDefault48Tiles());
    expect(updated.boardTiles.length).toBe(48);
  });
});
