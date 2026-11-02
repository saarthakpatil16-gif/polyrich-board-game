import { 
  BoardTileDTO, 
  RewardDTO, 
  PunishmentDTO, 
  GameRulesDTO, 
  PublicGameState,
  UploadedImageMeta 
} from '../types';

const API_BASE = '/api';

export const api = {
  /**
   * Create a new multiplayer room
   */
  async createRoom(hostName: string, avatar?: string, color?: string, customTemplate?: any) {
    const res = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostName, avatar, color, customTemplate })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create room');
    }
    return res.json();
  },

  /**
   * Get room state by code
   */
  async getRoom(code: string): Promise<{ state: PublicGameState }> {
    const res = await fetch(`${API_BASE}/rooms/${code}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch room');
    }
    return res.json();
  },

  /**
   * Join room
   */
  async joinRoom(code: string, playerName: string, avatar?: string, color?: string, sessionId?: string) {
    const res = await fetch(`${API_BASE}/rooms/${code}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName, avatar, color, sessionId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to join room');
    }
    return res.json();
  },

  /**
   * Start game (Host Only)
   */
  async startGame(code: string, hostSessionId: string): Promise<{ success: boolean; state: PublicGameState }> {
    const res = await fetch(`${API_BASE}/rooms/${code}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostSessionId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to start game');
    }
    return res.json();
  },

  /**
   * Add bot to room (Host Only)
   */
  async addBot(code: string, hostSessionId: string): Promise<{ success: boolean; state: PublicGameState }> {
    const res = await fetch(`${API_BASE}/rooms/${code}/bot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostSessionId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add bot');
    }
    return res.json();
  },

  /**
   * Remove bot from room (Host Only)
   */
  async removeBot(code: string, hostSessionId: string, botId?: string): Promise<{ success: boolean; state: PublicGameState }> {
    const res = await fetch(`${API_BASE}/rooms/${code}/bot/${botId || 'any'}?hostSessionId=${encodeURIComponent(hostSessionId)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to remove bot');
    }
    return res.json();
  },

  /**
   * Toggle player ready status
   */
  async toggleReady(code: string, sessionId: string): Promise<{ success: boolean; state: PublicGameState }> {
    const res = await fetch(`${API_BASE}/rooms/${code}/ready`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to toggle ready');
    }
    return res.json();
  },

  /**
   * Fetch board editor data
   */
  async getEditorData(code: string, hostSessionId: string) {
    const res = await fetch(`${API_BASE}/rooms/${code}/editor`, {
      headers: { 'x-host-session': hostSessionId }
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to load editor data');
    }
    return res.json();
  },

  /**
   * Save updated board tiles
   */
  async saveBoardTiles(code: string, hostSessionId: string, tiles: BoardTileDTO[]) {
    const res = await fetch(`${API_BASE}/rooms/${code}/editor/tiles`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-host-session': hostSessionId
      },
      body: JSON.stringify({ tiles, hostSessionId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save board tiles');
    }
    return res.json();
  },

  /**
   * Update single tile
   */
  async updateTile(code: string, hostSessionId: string, tileId: string, updates: Partial<BoardTileDTO>) {
    const res = await fetch(`${API_BASE}/rooms/${code}/editor/tile/${tileId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-host-session': hostSessionId
      },
      body: JSON.stringify({ updates, hostSessionId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update tile');
    }
    return res.json();
  },

  /**
   * Add custom tile to board
   */
  async addTile(code: string, hostSessionId: string, tileData: Partial<BoardTileDTO>) {
    const res = await fetch(`${API_BASE}/rooms/${code}/editor/tile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-host-session': hostSessionId
      },
      body: JSON.stringify({ ...tileData, hostSessionId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add tile');
    }
    return res.json();
  },

  /**
   * Delete tile from board
   */
  async deleteTile(code: string, hostSessionId: string, tileId: string) {
    const res = await fetch(`${API_BASE}/rooms/${code}/editor/tile/${tileId}`, {
      method: 'DELETE',
      headers: { 'x-host-session': hostSessionId }
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete tile');
    }
    return res.json();
  },

  /**
   * Save rewards
   */
  async saveRewards(code: string, hostSessionId: string, rewards: RewardDTO[]) {
    const res = await fetch(`${API_BASE}/rooms/${code}/editor/rewards`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-host-session': hostSessionId
      },
      body: JSON.stringify({ rewards, hostSessionId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save rewards');
    }
    return res.json();
  },

  /**
   * Save punishments
   */
  async savePunishments(code: string, hostSessionId: string, punishments: PunishmentDTO[]) {
    const res = await fetch(`${API_BASE}/rooms/${code}/editor/punishments`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-host-session': hostSessionId
      },
      body: JSON.stringify({ punishments, hostSessionId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save punishments');
    }
    return res.json();
  },

  /**
   * Save game rules
   */
  async saveRules(code: string, hostSessionId: string, rules: GameRulesDTO) {
    const res = await fetch(`${API_BASE}/rooms/${code}/editor/rules`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-host-session': hostSessionId
      },
      body: JSON.stringify({ rules, hostSessionId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save rules');
    }
    return res.json();
  },

  /**
   * Validate board configuration
   */
  async validateBoard(code: string): Promise<{ valid: boolean; errors: string[]; warnings: string[]; totalTiles: number }> {
    const res = await fetch(`${API_BASE}/rooms/${code}/editor/validate`, { method: 'POST' });
    return res.json();
  },

  /**
   * Upload user photo
   */
  async uploadPhoto(file: File): Promise<{ success: boolean; image: UploadedImageMeta; url: string }> {
    const formData = new FormData();
    formData.append('photo', file);

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to upload photo');
    }
    return res.json();
  },

  /**
   * Get uploaded photographs
   */
  async getUploadedPhotos(): Promise<{ images: UploadedImageMeta[] }> {
    const res = await fetch(`${API_BASE}/images`);
    return res.json();
  },

  /**
   * Delete uploaded photograph
   */
  async deletePhoto(filename: string) {
    const res = await fetch(`${API_BASE}/images/${filename}`, { method: 'DELETE' });
    return res.json();
  },

  /**
   * Get default template
   */
  async getDefaultTemplate() {
    const res = await fetch(`${API_BASE}/templates/default`);
    return res.json();
  },

  /**
   * Get all saved board templates
   */
  async getTemplates() {
    const res = await fetch(`${API_BASE}/templates`);
    return res.json();
  },

  /**
   * Save a reusable board template
   */
  async saveTemplate(template: {
    name: string;
    description?: string;
    tiles: any[];
    rewards: any[];
    punishments: any[];
    rules: any;
    existingId?: string;
  }) {
    const res = await fetch(`${API_BASE}/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save template');
    }
    return res.json();
  },

  /**
   * Update player avatar and colour
   */
  async updatePlayerAvatar(code: string, sessionId: string, avatar?: string, color?: string) {
    const res = await fetch(`${API_BASE}/rooms/${code}/player/${sessionId}/avatar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar, color })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update avatar');
    }
    return res.json();
  },
};
