import { 
  BoardTileDTO, 
  GameRulesDTO, 
  PlayerDTO, 
  RewardDTO, 
  PunishmentDTO, 
  GameTransactionDTO, 
  ActionStage,
  GameEventPopup
} from '../types/game.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface LandingResult {
  message: string;
  stage: ActionStage;
  moneyDelta: number;
  popup?: GameEventPopup | null;
  extraTurn?: boolean;
}

export class GameEngine {
  /**
   * Roll dice with cryptographic randomness on every roll
   */
  public static rollDice(rules: GameRulesDTO): { dice1: number; dice2: number; total: number; isDouble: boolean } {
    const sides = Math.max(2, rules.diceSides || 6);
    // crypto.randomInt provides cryptographically strong pseudo-random integers in range [min, max)
    const dice1 = crypto.randomInt(1, sides + 1);
    const dice2 = (rules.diceCount || 2) > 1 ? crypto.randomInt(1, sides + 1) : 0;
    const total = (rules.diceCount || 2) > 1 ? dice1 + dice2 : dice1;
    const isDouble = (rules.diceCount || 2) > 1 && dice1 === dice2;
    return { dice1, dice2, total, isDouble };
  }

  /**
   * Calculate new position with wraparound and start bonus
   */
  public static calculateMovement(
    currentPos: number,
    steps: number,
    totalTiles: number,
    rules: GameRulesDTO
  ): { newPos: number; passedStart: boolean; bonusAmount: number } {
    if (totalTiles <= 0) return { newPos: 0, passedStart: false, bonusAmount: 0 };
    
    // Support forward and backward steps
    let rawPos = currentPos + steps;
    let passedStart = false;
    let bonusAmount = 0;

    if (steps > 0) {
      if (rawPos >= totalTiles) {
        passedStart = true;
        bonusAmount = rules.passStartBonus;
      }
      rawPos = rawPos % totalTiles;
    } else {
      while (rawPos < 0) {
        rawPos += totalTiles;
      }
    }

    return {
      newPos: rawPos,
      passedStart,
      bonusAmount
    };
  }

  /**
   * Calculate effective rent for a property considering upgrade level & color group monopoly
   */
  public static calculateRent(tile: BoardTileDTO, allTiles: BoardTileDTO[]): number {
    let rent = tile.baseRent;
    if (tile.upgradeLevel === 1) rent = tile.rentLevel1 || Math.round(tile.baseRent * 2.5);
    else if (tile.upgradeLevel === 2) rent = tile.rentLevel2 || Math.round(tile.baseRent * 5);
    else if (tile.upgradeLevel === 3) rent = tile.rentLevel3 || Math.round(tile.baseRent * 10);

    // Color group monopoly bonus: if owner owns all properties in the same color group (at least 2 properties in district)
    if (tile.colorGroup && tile.ownerId && (!tile.upgradeLevel || tile.upgradeLevel === 0)) {
      const groupTiles = allTiles.filter(t => t.type === 'PROPERTY' && t.colorGroup === tile.colorGroup);
      const ownsAll = groupTiles.length > 1 && groupTiles.every(t => t.ownerId === tile.ownerId);
      if (ownsAll) {
        rent *= 2; // Standard monopoly double rent for unimproved full color set
      }
    }

    return rent;
  }

  /**
   * Process landing on a tile
   */
  public static resolveLanding(
    player: PlayerDTO,
    tile: BoardTileDTO,
    allTiles: BoardTileDTO[],
    allPlayers: PlayerDTO[],
    rewards: RewardDTO[],
    punishments: PunishmentDTO[],
    rules: GameRulesDTO
  ): {
    playerDelta: Partial<PlayerDTO>;
    otherPlayersDelta: { id: string; deltaMoney: number }[];
    tileDelta?: Partial<BoardTileDTO>;
    stage: ActionStage;
    transaction: Omit<GameTransactionDTO, 'id' | 'timestamp'>;
    popup?: GameEventPopup | null;
    extraTurn?: boolean;
    secondaryMovement?: number;
  } {
    const otherPlayersDelta: { id: string; deltaMoney: number }[] = [];
    let playerDelta: Partial<PlayerDTO> = {};
    let tileDelta: Partial<BoardTileDTO> | undefined;
    let stage: ActionStage = 'AWAITING_END_TURN';
    let transactionDetails = `${player.name} landed on ${tile.name}`;
    let txType = 'LAND';
    let txAmount = 0;
    let popup: GameEventPopup | null = null;
    let extraTurn = false;
    let secondaryMovement: number | undefined;

    switch (tile.type) {
      case 'START': {
        txType = 'START_BONUS';
        txAmount = rules.passStartBonus;
        playerDelta.money = player.money + txAmount;
        transactionDetails = `${player.name} landed directly on START and collected $${txAmount}`;
        popup = {
          id: uuidv4(),
          type: 'ANNOUNCEMENT',
          title: 'Direct Landing on START!',
          description: `You collected your salary of $${txAmount}!`,
          amount: txAmount
        };
        break;
      }

      case 'PROPERTY': {
        if (!tile.ownerId) {
          if (tile.canBuy && player.money >= tile.price) {
            stage = 'AWAITING_BUY_DECISION';
            transactionDetails = `${player.name} landed on unowned property ${tile.name} (Price: $${tile.price})`;
            popup = {
              id: uuidv4(),
              type: 'PROPERTY',
              title: tile.name,
              description: `This property is unowned. Would you like to buy it for $${tile.price}?`,
              amount: tile.price,
              imageUrl: tile.imageUrl,
              options: [
                { label: `Buy for $${tile.price}`, action: 'BUY' },
                { label: 'Pass / Skip', action: 'SKIP' }
              ]
            };
          } else {
            transactionDetails = `${player.name} landed on ${tile.name} but cannot buy it.`;
          }
        } else if (tile.ownerId === player.id) {
          // Self-owned property
          if (tile.upgradeCost > 0 && player.money >= tile.upgradeCost && (tile.upgradeLevel || 0) < 3) {
            transactionDetails = `${player.name} visited their own property ${tile.name}. Can upgrade for $${tile.upgradeCost}.`;
          } else {
            transactionDetails = `${player.name} visited their own property ${tile.name}.`;
          }
        } else {
          // Owned by another player! Pay rent!
          const owner = allPlayers.find(p => p.id === tile.ownerId);
          if (owner && !owner.inJail && !owner.isBankrupt) {
            const rent = this.calculateRent(tile, allTiles);
            txType = 'RENT';
            txAmount = rent;
            const deduction = Math.min(player.money, rent);
            playerDelta.money = player.money - deduction;
            otherPlayersDelta.push({ id: owner.id, deltaMoney: deduction });
            transactionDetails = `${player.name} paid $${deduction} rent to ${owner.name} for ${tile.name}`;
            
            popup = {
              id: uuidv4(),
              type: 'RENT',
              title: 'Rent Due!',
              description: `You landed on ${tile.name} owned by ${owner.name}. Paid $${deduction} rent!`,
              amount: -deduction,
              imageUrl: tile.imageUrl
            };

            if (deduction < rent && !rules.allowNegativeBalance) {
              playerDelta.isBankrupt = true;
              transactionDetails += ` (Bankrupt!)`;
            }
          }
        }
        break;
      }

      case 'TAX': {
        const taxAmount = tile.price > 0 ? tile.price : 100;
        txType = 'TAX';
        txAmount = taxAmount;
        playerDelta.money = Math.max(0, player.money - taxAmount);
        transactionDetails = `${player.name} paid $${taxAmount} in city taxes at ${tile.name}`;
        popup = {
          id: uuidv4(),
          type: 'PUNISHMENT',
          title: 'Tax Assessment',
          description: `You paid $${taxAmount} city fee at ${tile.name}.`,
          amount: -taxAmount
        };
        if (player.money < taxAmount && !rules.allowNegativeBalance) {
          playerDelta.isBankrupt = true;
        }
        break;
      }

      case 'REWARD':
      case 'CHANCE': {
        // Look up reward definition
        const reward = rewards.find(r => r.id === tile.rewardId) || rewards[0];
        if (reward) {
          txType = 'REWARD';
          txAmount = reward.moneyGain;
          playerDelta.money = player.money + reward.moneyGain;
          if (reward.bonusTurn) extraTurn = true;
          if (reward.movementSpaces !== 0) secondaryMovement = reward.movementSpaces;

          transactionDetails = `${player.name} received reward: ${reward.name} (+$${reward.moneyGain})`;
          popup = {
            id: uuidv4(),
            type: 'REWARD',
            title: reward.name,
            description: reward.description,
            amount: reward.moneyGain,
            imageUrl: reward.imageUrl || tile.imageUrl
          };
        }
        break;
      }

      case 'PUNISHMENT': {
        const punishment = punishments.find(p => p.id === tile.punishmentId) || punishments[0];
        if (punishment) {
          txType = 'PUNISHMENT';
          txAmount = punishment.moneyLoss;
          playerDelta.money = Math.max(0, player.money - punishment.moneyLoss);
          if (punishment.movementSpaces !== 0) secondaryMovement = punishment.movementSpaces;
          if (punishment.skipTurns > 0) playerDelta.jailTurns = (player.jailTurns || 0) + punishment.skipTurns;
          if (punishment.destinationTile !== null && punishment.destinationTile !== undefined) {
            playerDelta.position = punishment.destinationTile;
          }

          if (punishment.fineRecipient === 'NEXT_PLAYER') {
            const activeEligible = allPlayers.filter(p => !p.isBankrupt && p.id !== player.id);
            if (activeEligible.length > 0) {
              const nextP = activeEligible[0];
              otherPlayersDelta.push({ id: nextP.id, deltaMoney: punishment.moneyLoss });
            }
          }

          transactionDetails = `${player.name} suffered punishment: ${punishment.name} (-$${punishment.moneyLoss})`;
          popup = {
            id: uuidv4(),
            type: 'PUNISHMENT',
            title: punishment.name,
            description: punishment.description,
            amount: -punishment.moneyLoss,
            imageUrl: punishment.imageUrl || tile.imageUrl
          };

          if (player.money < punishment.moneyLoss && !rules.allowNegativeBalance) {
            playerDelta.isBankrupt = true;
          }
        }
        break;
      }

      case 'MOVE_TO': {
        if (tile.destinationIndex !== null && tile.destinationIndex !== undefined) {
          playerDelta.position = tile.destinationIndex;
          if (tile.destinationIndex === 12) {
            playerDelta.inJail = true;
            playerDelta.jailTurns = 1;
          }
          transactionDetails = `${player.name} was moved directly to space #${tile.destinationIndex}`;
          popup = {
            id: uuidv4(),
            type: 'JAIL',
            title: tile.name,
            description: tile.description || `Sent directly to tile #${tile.destinationIndex}`,
          };
        }
        break;
      }

      case 'JAIL': {
        transactionDetails = `${player.name} is visiting the detention center.`;
        popup = {
          id: uuidv4(),
          type: 'ANNOUNCEMENT',
          title: 'Visiting Jail',
          description: 'Just visiting! No penalty incurred.'
        };
        break;
      }

      case 'BONUS': {
        transactionDetails = `${player.name} is taking a break at ${tile.name}.`;
        popup = {
          id: uuidv4(),
          type: 'ANNOUNCEMENT',
          title: 'Rest Oasis',
          description: 'Relax and unwind. Safe haven!'
        };
        break;
      }

      default: {
        transactionDetails = `${player.name} arrived at ${tile.name}`;
      }
    }

    return {
      playerDelta,
      otherPlayersDelta,
      tileDelta,
      stage,
      transaction: {
        round: 1,
        playerId: player.id,
        playerName: player.name,
        playerColor: player.color,
        type: txType,
        amount: txAmount,
        details: transactionDetails
      },
      popup,
      extraTurn,
      secondaryMovement
    };
  }

  /**
   * Determine net worth of player (cash + unmortgaged property purchase costs + upgrades)
   */
  public static calculateNetWorth(player: PlayerDTO, boardTiles: BoardTileDTO[]): number {
    const ownedTiles = boardTiles.filter(t => t.ownerId === player.id);
    const propertiesValue = ownedTiles.reduce((acc, t) => {
      const upgradeValue = (t.upgradeLevel || 0) * (t.upgradeCost || 0);
      return acc + t.price + upgradeValue;
    }, 0);
    return player.money + propertiesValue;
  }
}
