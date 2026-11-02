import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { RoomManager } from '../services/roomManager.js';
import { createDefault48Tiles, DEFAULT_REWARDS, DEFAULT_PUNISHMENTS, DEFAULT_RULES } from '../engine/defaultBoard.js';
import { BoardTileDTO } from '../types/game.js';
import { io } from '../index.js';

const router = express.Router();
const roomManager = RoomManager.getInstance();

// Configure storage for user uploaded photos
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed.'));
    }
  }
});

// In-memory catalog of uploaded assets (also saved to DB/disk)
export interface UploadedImageMeta {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  uploadedAt: string;
}

function loadUploadedImagesFromDisk(): UploadedImageMeta[] {
  try {
    if (!fs.existsSync(uploadsDir)) return [];
    const files = fs.readdirSync(uploadsDir);
    return files
      .filter(f => /\.(jpg|jpeg|png|webp|svg)$/i.test(f))
      .map(filename => {
        const stats = fs.statSync(path.join(uploadsDir, filename));
        return {
          id: filename,
          filename,
          originalName: filename,
          url: `/uploads/${filename}`,
          size: stats.size,
          uploadedAt: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  } catch (e) {
    console.error('Error loading uploads from disk:', e);
    return [];
  }
}

const uploadedImages: UploadedImageMeta[] = loadUploadedImagesFromDisk();

// =================== IMAGE UPLOAD ENDPOINTS ===================

/**
 * Upload a photograph for city/tile
 */
router.post('/upload', upload.single('photo'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const host = req.get('host') || 'localhost:4000';
    const protocol = req.protocol || 'http';
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    const imageRecord: UploadedImageMeta = {
      id: uuidv4(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: `/uploads/${req.file.filename}`, // relative URL works across domains/proxies
      size: req.file.size,
      uploadedAt: new Date().toISOString()
    };

    uploadedImages.unshift(imageRecord);

    return res.json({
      success: true,
      image: imageRecord,
      url: imageRecord.url
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Image upload failed' });
  }
});

/**
 * List all uploaded photographs
 */
router.get('/images', (_req: Request, res: Response) => {
  return res.json({
    images: uploadedImages.length > 0 ? uploadedImages : loadUploadedImagesFromDisk()
  });
});

/**
 * Delete an uploaded photograph
 */
router.delete('/images/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename as string;
  const filePath = path.join(uploadsDir, filename);

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error('Error removing file:', e);
    }
  }

  const idx = uploadedImages.findIndex(img => img.filename === filename || img.id === filename);
  if (idx !== -1) {
    uploadedImages.splice(idx, 1);
  }

  return res.json({ success: true, message: 'Image deleted' });
});

// =================== ROOM ENDPOINTS ===================

/**
 * Create a new multiplayer room
 */
router.post('/rooms', (req: Request, res: Response) => {
  try {
    const { hostName, avatar, color, customTemplate } = req.body;
    const { room, hostPlayer } = roomManager.createRoom(hostName, avatar, color, customTemplate);

    const host = req.get('host') || 'localhost:5173';
    const inviteUrl = `${req.protocol}://${host}/room/${room.code}`;

    return res.status(201).json({
      roomCode: room.code,
      roomId: room.id,
      inviteUrl,
      hostSessionId: room.hostSessionId,
      hostPlayer,
      state: roomManager.getPublicState(room)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Get room state by code
 */
router.get('/rooms/:code', (req: Request, res: Response) => {
  const code = req.params.code as string;
  const room = roomManager.getRoom(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  return res.json({
    state: roomManager.getPublicState(room)
  });
});

/**
 * Join an existing room via REST
 */
router.post('/rooms/:code/join', (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;
    const { playerName, avatar, color, sessionId } = req.body;
    const { room, player, isReconnect } = roomManager.joinRoom(
      code,
      playerName,
      avatar,
      color,
      sessionId
    );

    // Broadcast room update to all existing clients in the room via Socket.IO
    if (io) {
      io.to(code.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));
    }

    return res.json({
      success: true,
      isReconnect,
      player,
      sessionId: player.sessionId,
      state: roomManager.getPublicState(room)
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * Start game via REST (Host Only)
 */
router.post('/rooms/:code/start', (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;
    const hostSessionId = (req.headers['x-host-session'] as string) || req.body.hostSessionId;
    const room = roomManager.startGame(code, hostSessionId);
    
    if (io) {
      io.to(code.toUpperCase()).emit('game_started', roomManager.getPublicState(room));
      io.to(code.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));
    }

    return res.json({
      success: true,
      state: roomManager.getPublicState(room)
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * Add bot via REST (Host Only)
 */
router.post('/rooms/:code/bot', (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;
    const hostSessionId = (req.headers['x-host-session'] as string) || req.body.hostSessionId;
    const room = roomManager.addBot(code, hostSessionId);
    
    if (io) {
      io.to(code.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));
    }

    return res.json({
      success: true,
      state: roomManager.getPublicState(room)
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * Remove bot via REST (Host Only)
 */
router.delete('/rooms/:code/bot/:botId', (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;
    const botId = req.params.botId as string;
    const hostSessionId = (req.headers['x-host-session'] as string) || (req.query.hostSessionId as string) || req.body.hostSessionId;
    const room = roomManager.removeBot(code, hostSessionId, botId === 'any' ? undefined : botId);
    
    if (io) {
      io.to(code.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));
    }

    return res.json({
      success: true,
      state: roomManager.getPublicState(room)
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * Toggle player ready via REST
 */
router.post('/rooms/:code/ready', (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;
    const { sessionId } = req.body;
    const room = roomManager.toggleReady(code, sessionId);

    if (io) {
      io.to(code.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));
    }

    return res.json({
      success: true,
      state: roomManager.getPublicState(room)
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.patch('/rooms/:code/player/:sessionId/avatar', async (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;
    const sessionId = req.params.sessionId as string;
    const { avatar, color } = req.body as { avatar?: string; color?: string };

    const room = roomManager.getRoom(code);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const player = room.players.find(p => p.sessionId === sessionId);
    if (!player) return res.status(404).json({ error: 'Player not found' });

    // validation
    const allowedShapes = [
      'crown','rocket','trophy','cat','zap','gem','anchor','shield','car','star','token-1','token-2'
    ];
    if (avatar && !allowedShapes.includes(avatar)) {
      return res.status(400).json({ error: 'Invalid pawn shape' });
    }
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return res.status(400).json({ error: 'Invalid colour format' });
    }

    if (avatar) player.avatar = avatar;
    if (color) player.color = color;

    // broadcast update
    io.to(room.code.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));

    return res.json({ success: true, player });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});

// =================== HOST ADMIN DASHBOARD / BOARD EDITOR ===================

/**
 * Get full board editor data
 */
router.get('/rooms/:code/editor', (req: Request, res: Response) => {
  const code = req.params.code as string;
  const room = roomManager.getRoom(code);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const hostSessionId = (req.headers['x-host-session'] as string) || (req.query.hostSession as string);
  const isHost = room.hostSessionId === hostSessionId;

  return res.json({
    roomCode: room.code,
    isHost,
    boardTiles: room.boardTiles,
    rewards: room.rewards,
    punishments: room.punishments,
    rules: room.rules,
    status: room.status,
    totalTiles: room.boardTiles.length
  });
});

/**
 * Save updated tiles from board editor
 */
router.put('/rooms/:code/editor/tiles', (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;
    const hostSessionId = (req.headers['x-host-session'] as string) || req.body.hostSessionId;
    const { tiles } = req.body;

    if (!Array.isArray(tiles)) {
      return res.status(400).json({ error: 'Invalid tiles payload' });
    }

    const room = roomManager.updateBoardTiles(code, hostSessionId, tiles);
    if (io) {
      io.to(code.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));
    }
    return res.json({
      success: true,
      message: 'Board tiles successfully updated and saved',
      boardTiles: room.boardTiles
    });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

/**
 * Update single tile
 */
router.put('/rooms/:code/editor/tile/:id', (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;
    const tileId = req.params.id as string;
    const hostSessionId = (req.headers['x-host-session'] as string) || req.body.hostSessionId;
    const room = roomManager.getRoom(code);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.hostSessionId !== hostSessionId) return res.status(403).json({ error: 'Host only' });

    const tileIdx = room.boardTiles.findIndex(t => t.id === tileId);
    if (tileIdx === -1) return res.status(404).json({ error: 'Tile not found' });

    room.boardTiles[tileIdx] = {
      ...room.boardTiles[tileIdx],
      ...req.body.updates
    };

    return res.json({
      success: true,
      tile: room.boardTiles[tileIdx]
    });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

/**
 * Add custom tile to board
 */
router.post('/rooms/:code/editor/tile', (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;
    const hostSessionId = (req.headers['x-host-session'] as string) || req.body.hostSessionId;
    const room = roomManager.getRoom(code);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.hostSessionId !== hostSessionId) return res.status(403).json({ error: 'Host only' });

    const newIndex = room.boardTiles.length;
    const newTile: BoardTileDTO = {
      id: `tile-${newIndex}-${uuidv4().slice(0, 8)}`,
      index: newIndex,
      name: req.body.name || `Custom Space ${newIndex + 1}`,
      type: req.body.type || 'PROPERTY',
      colorGroup: req.body.colorGroup || '#3b82f6',
      district: req.body.district || 'New Horizon',
      description: req.body.description || 'Custom player space',
      imageUrl: req.body.imageUrl || null,
      imageFit: 'cover',
      price: req.body.price ?? 200,
      baseRent: req.body.baseRent ?? 20,
      rentLevel1: req.body.rentLevel1 ?? 50,
      rentLevel2: req.body.rentLevel2 ?? 100,
      rentLevel3: req.body.rentLevel3 ?? 200,
      upgradeCost: req.body.upgradeCost ?? 120,
      canBuy: req.body.canBuy ?? true,
      canTrade: true,
      rewardId: req.body.rewardId || null,
      punishmentId: req.body.punishmentId || null,
      destinationIndex: req.body.destinationIndex || null,
      isEnabled: true
    };

    room.boardTiles.push(newTile);
    return res.json({
      success: true,
      tile: newTile,
      totalTiles: room.boardTiles.length
    });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

/**
 * Delete tile from board
 */
router.delete('/rooms/:code/editor/tile/:id', (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;
    const tileId = req.params.id as string;
    const hostSessionId = (req.headers['x-host-session'] as string) || (req.query.hostSession as string);
    const room = roomManager.getRoom(code);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.hostSessionId !== hostSessionId) return res.status(403).json({ error: 'Host only' });

    const tileIdx = room.boardTiles.findIndex(t => t.id === tileId);
    if (tileIdx === -1) return res.status(404).json({ error: 'Tile not found' });

    // Prevent deleting Corner 0 (START)
    if (room.boardTiles[tileIdx].type === 'START') {
      return res.status(400).json({ error: 'Cannot delete the START tile.' });
    }

    room.boardTiles.splice(tileIdx, 1);
    // Reindex remaining tiles
    room.boardTiles.forEach((t, i) => {
      t.index = i;
    });

    return res.json({
      success: true,
      message: 'Tile removed and board reindexed',
      totalTiles: room.boardTiles.length
    });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

/**
 * Update rewards configuration
 */
router.put('/rooms/:code/editor/rewards', (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;
    const hostSessionId = (req.headers['x-host-session'] as string) || req.body.hostSessionId;
    const { rewards } = req.body;
    const room = roomManager.updateRewards(code, hostSessionId, rewards);
    if (io) {
      io.to(code.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));
    }
    return res.json({ success: true, rewards: room.rewards });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

/**
 * Update punishments configuration
 */
router.put('/rooms/:code/editor/punishments', (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;
    const hostSessionId = (req.headers['x-host-session'] as string) || req.body.hostSessionId;
    const { punishments } = req.body;
    const room = roomManager.updatePunishments(code, hostSessionId, punishments);
    if (io) {
      io.to(code.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));
    }
    return res.json({ success: true, punishments: room.punishments });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

/**
 * Update game rules
 */
router.put('/rooms/:code/editor/rules', (req: Request, res: Response) => {
  try {
    const code = req.params.code as string;
    const hostSessionId = (req.headers['x-host-session'] as string) || req.body.hostSessionId;
    const { rules } = req.body;
    const room = roomManager.updateGameRules(code, hostSessionId, rules);
    if (io) {
      io.to(code.toUpperCase()).emit('game_state_updated', roomManager.getPublicState(room));
    }
    return res.json({ success: true, rules: room.rules });
  } catch (err: any) {
    return res.status(403).json({ error: err.message });
  }
});

/**
 * Validate board configuration
 */
router.post('/rooms/:code/editor/validate', (req: Request, res: Response) => {
  const code = req.params.code as string;
  const room = roomManager.getRoom(code);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check 1: Must have at least 1 START tile
  const startTiles = room.boardTiles.filter(t => t.type === 'START');
  if (startTiles.length === 0) {
    errors.push('Board must contain at least one START tile.');
  }

  // Check 2: Minimum tiles count
  if (room.boardTiles.length < 16) {
    errors.push('Board must have at least 16 tiles to form a playable square perimeter.');
  }

  // Check 3: Property prices
  const invalidPrice = room.boardTiles.filter(t => t.type === 'PROPERTY' && t.price <= 0);
  if (invalidPrice.length > 0) {
    warnings.push(`${invalidPrice.length} property tiles have $0 price.`);
  }

  // Check 4: Check 4 corners aligned
  if (room.boardTiles.length % 4 !== 0) {
    warnings.push(`Current tile count (${room.boardTiles.length}) is not divisible by 4. Recommended square perimeter is 48 tiles.`);
  }

  return res.json({
    valid: errors.length === 0,
    errors,
    warnings,
    totalTiles: room.boardTiles.length
  });
});

// =================== TEMPLATES & PRESETS ===================

router.get('/templates', (req: Request, res: Response) => {
  const userIdentifier = (req.query.userId || req.query.userEmail) as string | undefined;
  return res.json({
    templates: roomManager.getTemplates(userIdentifier)
  });
});

router.get('/templates/default', (req: Request, res: Response) => {
  const userIdentifier = (req.query.userId || req.query.userEmail) as string | undefined;
  return res.json(roomManager.getDefaultTemplate(userIdentifier));
});

router.get('/templates/user/:userIdentifier', (req: Request, res: Response) => {
  const userIdentifier = req.params.userIdentifier as string;
  return res.json({
    templates: roomManager.getUserTemplates(userIdentifier)
  });
});

router.get('/templates/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const tpl = roomManager.getTemplate(id);
  if (!tpl) return res.status(404).json({ error: 'Template not found' });
  return res.json(tpl);
});

router.post('/templates', (req: Request, res: Response) => {
  try {
    const { name, description, tiles, rewards, punishments, rules, existingId, userId, userEmail } = req.body;
    const template = roomManager.saveTemplate(
      name,
      description,
      tiles,
      rewards,
      punishments,
      rules,
      existingId,
      userId,
      userEmail
    );
    return res.status(201).json({
      success: true,
      message: 'Template successfully saved permanently for future rooms',
      template
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
