import { BoardTileDTO, RewardDTO, PunishmentDTO, GameRulesDTO } from '../types/game.js';
import { v4 as uuidv4 } from 'uuid';

export const DEFAULT_RULES: GameRulesDTO = {
  startingCash: 1500,
  passStartBonus: 200,
  diceCount: 2,
  diceSides: 6,
  turnTimerSec: 45,
  bankruptcyThreshold: 0,
  allowNegativeBalance: false,
  eliminationEnabled: true,
  tradingEnabled: true,
  maxRounds: 50,
};

export const DEFAULT_REWARDS: RewardDTO[] = [
  {
    id: 'rew-angel-invest',
    name: 'Angel Investment',
    description: 'A venture capital firm funds your venture. Receive $250.',
    moneyGain: 250,
    movementSpaces: 0,
    bonusTurn: false,
    execution: 'AUTO',
  },
  {
    id: 'rew-crypto-bull',
    name: 'Crypto Rally',
    description: 'Your cryptocurrency portfolio surges. Gain $180.',
    moneyGain: 180,
    movementSpaces: 0,
    bonusTurn: false,
    execution: 'AUTO',
  },
  {
    id: 'rew-lucky-sprint',
    name: 'Express Lane',
    description: 'Smooth traffic ahead! Advance 3 spaces forward and gain $50.',
    moneyGain: 50,
    movementSpaces: 3,
    bonusTurn: false,
    execution: 'AUTO',
  },
  {
    id: 'rew-golden-ticket',
    name: 'Golden Ticket',
    description: 'VIP privilege granted! Gain $100 and take an extra turn immediately.',
    moneyGain: 100,
    movementSpaces: 0,
    bonusTurn: true,
    execution: 'AUTO',
  },
  {
    id: 'rew-tax-rebate',
    name: 'Tax Refund',
    description: 'The revenue service corrected an assessment in your favor. Collect $150.',
    moneyGain: 150,
    movementSpaces: 0,
    bonusTurn: false,
    execution: 'AUTO',
  }
];

export const DEFAULT_PUNISHMENTS: PunishmentDTO[] = [
  {
    id: 'pun-market-crash',
    name: 'Market Downturn',
    description: 'Economic downturn strikes your portfolio. Pay $150 to the bank.',
    moneyLoss: 150,
    fineRecipient: 'BANK',
    movementSpaces: 0,
    skipTurns: 0,
    execution: 'AUTO',
  },
  {
    id: 'pun-luxury-tax',
    name: 'Luxury Audit',
    description: 'Excessive luxury surcharge imposed. Pay $120 to the bank.',
    moneyLoss: 120,
    fineRecipient: 'BANK',
    movementSpaces: 0,
    skipTurns: 0,
    execution: 'AUTO',
  },
  {
    id: 'pun-traffic-fine',
    name: 'Speeding Infraction',
    description: 'Caught speeding on the express turnpike. Pay $80 and move back 2 spaces.',
    moneyLoss: 80,
    fineRecipient: 'BANK',
    movementSpaces: -2,
    skipTurns: 0,
    execution: 'AUTO',
  },
  {
    id: 'pun-detain',
    name: 'Detention Order',
    description: 'Detained for customs inspection! Sent to Jail and skip 1 turn.',
    moneyLoss: 50,
    fineRecipient: 'BANK',
    movementSpaces: 0,
    skipTurns: 1,
    destinationTile: 12, // Jail index on 48-tile board
    execution: 'AUTO',
  },
  {
    id: 'pun-tip-next',
    name: 'Charity Gala Dinner',
    description: 'You hosted a charity dinner for rival moguls. Pay $75 to the next player!',
    moneyLoss: 75,
    fineRecipient: 'NEXT_PLAYER',
    movementSpaces: 0,
    skipTurns: 0,
    execution: 'AUTO',
  }
];

export function createDefault48Tiles(): BoardTileDTO[] {
  // 48 tiles total:
  // Corners: 0 (START), 12 (JAIL), 24 (REST/BONUS), 36 (GO TO JAIL)
  // Each side has 12 tiles (Corner + 11 tiles)
  const tiles: BoardTileDTO[] = [];

  const addTile = (
    index: number,
    name: string,
    type: BoardTileDTO['type'],
    colorGroup: string | null = null,
    district: string | null = null,
    price = 0,
    baseRent = 0,
    extra: Partial<BoardTileDTO> = {}
  ) => {
    tiles.push({
      id: `tile-${index}-${uuidv4().slice(0, 8)}`,
      index,
      name,
      type,
      colorGroup,
      district,
      description: extra.description || (type === 'PROPERTY' ? `${name} prime real estate in ${district}` : `${name} location`),
      imageUrl: extra.imageUrl || null,
      imageFit: 'cover',
      price,
      baseRent,
      rentLevel1: Math.round(baseRent * 2.5),
      rentLevel2: Math.round(baseRent * 5),
      rentLevel3: Math.round(baseRent * 10),
      upgradeCost: Math.round(price * 0.6),
      canBuy: type === 'PROPERTY',
      canTrade: type === 'PROPERTY',
      rewardId: extra.rewardId || null,
      punishmentId: extra.punishmentId || null,
      specialEffect: extra.specialEffect || null,
      destinationIndex: extra.destinationIndex ?? null,
      isEnabled: true,
      ...extra
    });
  };

  // ================= SIDE 1: BOTTOM (Indices 0 to 11) =================
  addTile(0, 'GO / START', 'START', null, 'Nexus', 0, 0, { description: 'Collect $200 salary whenever you pass or land here.' });
  addTile(1, 'Old Harbor Walk', 'PROPERTY', '#92400e', 'Historic Port', 60, 6);
  addTile(2, 'Community Chest', 'REWARD', null, 'Civic Center', 0, 0, { rewardId: 'rew-angel-invest' });
  addTile(3, 'Fisherman Wharf', 'PROPERTY', '#92400e', 'Historic Port', 70, 8);
  addTile(4, 'Port Toll Road', 'TAX', null, 'Transit', 0, 0, { price: 100, description: 'Pay $100 harbor entrance toll' });
  addTile(5, 'South Rail Hub', 'TRANS', '#475569', 'Transportation', 200, 25);
  addTile(6, 'Sunset Boulevard', 'PROPERTY', '#0284c7', 'Coastal District', 100, 10);
  addTile(7, 'Lucky Surprise', 'REWARD', null, 'Fortune Hub', 0, 0, { rewardId: 'rew-crypto-bull' });
  addTile(8, 'Marina Bay Pier', 'PROPERTY', '#0284c7', 'Coastal District', 110, 12);
  addTile(9, 'Bayside Promenade', 'PROPERTY', '#0284c7', 'Coastal District', 120, 14);
  // 2 EXTRA TILES for Bottom Side:
  addTile(10, 'Custom Bay Slot 1', 'PROPERTY', '#0891b2', 'Waterfront Expansion', 130, 15, { description: 'Customizable location slot' });
  addTile(11, 'Waterfront Plaza', 'PROPERTY', '#0891b2', 'Waterfront Expansion', 140, 16, { description: 'Customizable location slot' });

  // ================= SIDE 2: LEFT (Indices 12 to 23) =================
  addTile(12, 'JAIL / VISITING', 'JAIL', null, 'Metropolitan Detention', 0, 0, { description: 'Just visiting or serving your detention.' });
  addTile(13, 'Maplewood Avenue', 'PROPERTY', '#db2777', 'Suburban Valley', 140, 16);
  addTile(14, 'Electric Power Grid', 'TRANS', '#ca8a04', 'Utilities', 150, 20);
  addTile(15, 'Chestnut Heights', 'PROPERTY', '#db2777', 'Suburban Valley', 150, 18);
  addTile(16, 'Magnolia Crescent', 'PROPERTY', '#db2777', 'Suburban Valley', 160, 20);
  addTile(17, 'West Station Metro', 'TRANS', '#475569', 'Transportation', 200, 25);
  addTile(18, 'Bowery Square', 'PROPERTY', '#ea580c', 'Commercial Row', 180, 22);
  addTile(19, 'Fortune Chest', 'REWARD', null, 'Fortune Hub', 0, 0, { rewardId: 'rew-lucky-sprint' });
  addTile(20, 'Vineyard Boulevard', 'PROPERTY', '#ea580c', 'Commercial Row', 190, 24);
  addTile(21, 'Market Row Concourse', 'PROPERTY', '#ea580c', 'Commercial Row', 200, 26);
  // 2 EXTRA TILES for Left Side:
  addTile(22, 'Foundry Arts District', 'PROPERTY', '#d97706', 'Cultural Quarter', 210, 28, { description: 'Customizable cultural slot' });
  addTile(23, 'Artisan Alley', 'PUNISHMENT', null, 'City Court', 0, 0, { punishmentId: 'pun-traffic-fine', description: 'Parking violation and fine' });

  // ================= SIDE 3: TOP (Indices 24 to 35) =================
  addTile(24, 'REST OASIS / BONUS', 'BONUS', null, 'Free Zone', 0, 0, { description: 'Free parking & relaxation zone. No penalty!' });
  addTile(25, 'Avenue of the Americas', 'PROPERTY', '#dc2626', 'Finance Corridor', 220, 30);
  addTile(26, 'Mystery Event', 'CHANCE', null, 'Global Events', 0, 0, { rewardId: 'rew-golden-ticket' });
  addTile(27, 'Wall Street Plaza', 'PROPERTY', '#dc2626', 'Finance Corridor', 230, 32);
  addTile(28, 'Lexington Avenue', 'PROPERTY', '#dc2626', 'Finance Corridor', 240, 34);
  addTile(29, 'North Central Terminal', 'TRANS', '#475569', 'Transportation', 200, 25);
  addTile(30, 'Ventura Highway', 'PROPERTY', '#eab308', 'Silicon Strip', 260, 36);
  addTile(31, 'Tech Park Boulevard', 'PROPERTY', '#eab308', 'Silicon Strip', 270, 38);
  addTile(32, 'Hydro Water Works', 'TRANS', '#ca8a04', 'Utilities', 150, 20);
  addTile(33, 'Silicon Valley Drive', 'PROPERTY', '#eab308', 'Silicon Strip', 280, 40);
  // 2 EXTRA TILES for Top Side:
  addTile(34, 'Quantum Labs Parkway', 'PROPERTY', '#84cc16', 'Research Triangle', 290, 42, { description: 'High tech research parcel' });
  addTile(35, 'Angel Investors Hub', 'REWARD', null, 'Capital Venture', 0, 0, { rewardId: 'rew-angel-invest' });

  // ================= SIDE 4: RIGHT (Indices 36 to 47) =================
  addTile(36, 'GO TO JAIL', 'MOVE_TO', null, 'Police Headquarters', 0, 0, { destinationIndex: 12, description: 'Directly move to Jail. Do not pass GO, do not collect $200.' });
  addTile(37, 'Pacific Heights', 'PROPERTY', '#16a34a', 'Emerald Hills', 300, 45);
  addTile(38, 'Greenwich Gardens', 'PROPERTY', '#16a34a', 'Emerald Hills', 310, 48);
  addTile(39, 'Executive Audit Office', 'PUNISHMENT', null, 'Auditor General', 0, 0, { punishmentId: 'pun-luxury-tax' });
  addTile(40, 'Kensington Gardens', 'PROPERTY', '#16a34a', 'Emerald Hills', 320, 50);
  addTile(41, 'East Grand Central', 'TRANS', '#475569', 'Transportation', 200, 25);
  addTile(42, 'Chance Matrix', 'CHANCE', null, 'Fate Deck', 0, 0, { rewardId: 'rew-tax-rebate' });
  addTile(43, 'Park Lane Boulevard', 'PROPERTY', '#4f46e5', 'Billionaires Row', 350, 60);
  addTile(44, 'Wealth Surtax', 'TAX', null, 'Treasury', 0, 0, { price: 150, description: 'Pay $150 luxury wealth tax' });
  addTile(45, 'Mayfair Imperial', 'PROPERTY', '#4f46e5', 'Billionaires Row', 400, 75);
  // 2 EXTRA TILES for Right Side:
  addTile(46, 'Diamond Pinnacle', 'PROPERTY', '#7c3aed', 'Skyline District', 420, 85, { description: 'Ultra luxury skyscraper penthouse' });
  addTile(47, 'Charity Gala Benefit', 'PUNISHMENT', null, 'Diplomatic Enclave', 0, 0, { punishmentId: 'pun-tip-next', description: 'Host dinner for rivals' });

  return tiles;
}
