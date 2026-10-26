export type TileType = 
  | 'START' 
  | 'PROPERTY' 
  | 'REWARD' 
  | 'PUNISHMENT' 
  | 'TAX' 
  | 'JAIL' 
  | 'CHANCE' 
  | 'TRANS' 
  | 'BONUS' 
  | 'MOVE_TO' 
  | 'CUSTOM';

export type RoomStatus = 'LOBBY' | 'PLAYING' | 'PAUSED' | 'FINISHED';

export type ActionStage = 
  | 'AWAITING_ROLL' 
  | 'AWAITING_BUY_DECISION' 
  | 'AWAITING_REWARD_CONFIRM' 
  | 'AWAITING_PUNISH_CONFIRM' 
  | 'AWAITING_END_TURN' 
  | 'AUCTION_ACTIVE'
  | 'GAME_OVER';

export interface BoardTileDTO {
  id: string;
  index: number;
  name: string;
  type: TileType;
  colorGroup?: string | null;
  district?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  imageFit: 'cover' | 'contain';
  price: number;
  baseRent: number;
  rentLevel1: number;
  rentLevel2: number;
  rentLevel3: number;
  upgradeCost: number;
  canBuy: boolean;
  canTrade: boolean;
  rewardId?: string | null;
  punishmentId?: string | null;
  specialEffect?: string | null;
  destinationIndex?: number | null;
  isEnabled: boolean;
  ownerId?: string | null;
  upgradeLevel?: number;
  isMortgaged?: boolean;
}

export interface RewardDTO {
  id: string;
  name: string;
  description: string;
  moneyGain: number;
  movementSpaces: number;
  bonusTurn: boolean;
  execution: 'AUTO' | 'CONFIRM';
  imageUrl?: string | null;
}

export interface PunishmentDTO {
  id: string;
  name: string;
  description: string;
  moneyLoss: number;
  fineRecipient: 'BANK' | 'NEXT_PLAYER' | 'ALL_PLAYERS';
  movementSpaces: number;
  skipTurns: number;
  destinationTile?: number | null;
  execution: 'AUTO' | 'CONFIRM';
  imageUrl?: string | null;
}

export type PawnShape = 
  | 'crown' 
  | 'rocket' 
  | 'trophy' 
  | 'cat' 
  | 'zap' 
  | 'gem' 
  | 'anchor' 
  | 'shield' 
  | 'car' 
  | 'star';

export interface GameRulesDTO {
  startingCash: number;
  passStartBonus: number;
  diceCount: number;
  diceSides: number;
  turnTimerSec: number;
  bankruptcyThreshold: number;
  allowNegativeBalance: boolean;
  eliminationEnabled: boolean;
  tradingEnabled: boolean;
  maxRounds: number;
  quickGameMode?: boolean;
  auctionEnabled?: boolean;
  marketEventsEnabled?: boolean;
  mortgageInterestRate?: number;
}

export interface PlayerDTO {
  id: string;
  sessionId: string;
  name: string;
  avatar: string; // PawnShape identifier
  color: string;
  isHost: boolean;
  isReady: boolean;
  isBot?: boolean;
  money: number;
  position: number;
  inJail: boolean;
  jailTurns: number;
  isBankrupt: boolean;
  isConnected: boolean;
  orderIndex: number;
  netWorth: number;
  propertyCount: number;
  housesCount?: number;
  hotelsCount?: number;
  mortgageDebt?: number;
  totalRentCollected?: number;
  totalRentPaid?: number;
}

export interface GameTransactionDTO {
  id: string;
  round: number;
  playerId?: string | null;
  playerName?: string | null;
  playerColor?: string | null;
  type: string;
  amount: number;
  details: string;
  timestamp: string;
}

export interface GameEventPopup {
  id: string;
  type: 'REWARD' | 'PUNISHMENT' | 'PROPERTY' | 'RENT' | 'JAIL' | 'ANNOUNCEMENT' | 'BANKRUPTCY_WARNING';
  title: string;
  description: string;
  amount?: number;
  imageUrl?: string | null;
  options?: { label: string; action: string }[];
}

export interface TradeProposal {
  id: string;
  fromPlayerId: string;
  fromPlayerName: string;
  toPlayerId: string;
  toPlayerName: string;
  offeredMoney: number;
  offeredTileIds: string[];
  requestedMoney: number;
  requestedTileIds: string[];
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  createdAt: number;
}

export interface AuctionState {
  id: string;
  tileId: string;
  tileName: string;
  tilePrice: number;
  currentBid: number;
  highestBidderId: string | null;
  highestBidderName: string | null;
  timeRemainingSec: number;
  active: boolean;
}

export interface BoardTemplateDTO {
  id: string;
  name: string;
  description: string;
  tiles: BoardTileDTO[];
  rewards: RewardDTO[];
  punishments: PunishmentDTO[];
  rules: GameRulesDTO;
  updatedAt: string;
}

export interface PublicGameState {
  roomCode: string;
  status: RoomStatus;
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
  activePopup?: GameEventPopup | null;
  activeTrade?: TradeProposal | null;
  activeAuction?: AuctionState | null;
  marketEvent?: { title: string; description: string; effect: string } | null;
  roundSummary?: { round: number; topEarner?: string; summaryText: string } | null;
}

export interface UploadedImageMeta {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  uploadedAt: string;
}
