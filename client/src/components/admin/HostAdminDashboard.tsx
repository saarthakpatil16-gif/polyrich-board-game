import React, { useState, useEffect } from 'react';
import { 
  BoardTileDTO, 
  RewardDTO, 
  PunishmentDTO, 
  GameRulesDTO, 
  UploadedImageMeta,
  PublicGameState
} from '../../types';
import { api } from '../../services/api';
import { soundFX } from '../../utils/audio';
import { GoogleUserProfile } from '../../services/googleAuth';
import { BoardGrid } from '../board/BoardGrid';
import { 
  LayoutGrid, 
  MapPin, 
  Image as ImageIcon, 
  DollarSign, 
  Gift, 
  AlertTriangle, 
  Sparkles, 
  Sliders, 
  Users, 
  CheckCircle, 
  Check, 
  Save, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Upload, 
  RotateCcw, 
  Eye, 
  AlertCircle,
  X,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface HostAdminDashboardProps {
  roomCode: string;
  hostSessionId: string;
  initialTiles: BoardTileDTO[];
  initialRewards: RewardDTO[];
  initialPunishments: PunishmentDTO[];
  initialRules: GameRulesDTO;
  googleUser?: GoogleUserProfile | null;
  onClose: () => void;
  onSaved: (tiles: BoardTileDTO[], rewards: RewardDTO[], punishments: PunishmentDTO[], rules: GameRulesDTO) => void;
}

export const HostAdminDashboard: React.FC<HostAdminDashboardProps> = ({
  roomCode,
  hostSessionId,
  initialTiles,
  initialRewards,
  initialPunishments,
  initialRules,
  googleUser,
  onClose,
  onSaved,
}) => {
  // Current active tab (1 through 10)
  const [activeTab, setActiveTab] = useState<number>(1);

  // Editable working state with Undo history
  const [tiles, setTiles] = useState<BoardTileDTO[]>(JSON.parse(JSON.stringify(initialTiles)));
  const [rewards, setRewards] = useState<RewardDTO[]>(JSON.parse(JSON.stringify(initialRewards)));
  const [punishments, setPunishments] = useState<PunishmentDTO[]>(JSON.parse(JSON.stringify(initialPunishments)));
  const [rules, setRules] = useState<GameRulesDTO>({ ...initialRules });

  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedImageMeta[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [validationReport, setValidationReport] = useState<{ valid: boolean; errors: string[]; warnings: string[] } | null>(null);
  const [customTemplateName, setCustomTemplateName] = useState<string>('My Custom Board');
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  // Selected tile for granular editing
  const [selectedTileId, setSelectedTileId] = useState<string>(tiles[0]?.id || '');
  const [imageInputUrl, setImageInputUrl] = useState<string>('');

  // Load uploaded photos and active template name on mount
  useEffect(() => {
    api.getUploadedPhotos().then(res => {
      if (res.images) setUploadedPhotos(res.images);
    }).catch(console.error);

    const userIdent = googleUser?.email || googleUser?.sub;
    api.getDefaultTemplate(userIdent).then(tpl => {
      if (tpl?.name) setCustomTemplateName(tpl.name);
    }).catch(console.warn);
  }, [googleUser]);

  const pushUndo = () => {
    setUndoStack(prev => [...prev.slice(-10), JSON.stringify({ tiles, rewards, punishments, rules })]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    try {
      const parsed = JSON.parse(last);
      setTiles(parsed.tiles);
      setRewards(parsed.rewards);
      setPunishments(parsed.punishments);
      setRules(parsed.rules);
      setUndoStack(prev => prev.slice(0, -1));
      soundFX.playClick();
    } catch (e) {
      console.error(e);
    }
  };

  // ================= TILE MANIPULATION =================
  const handleUpdateTile = (id: string, updates: Partial<BoardTileDTO>) => {
    pushUndo();
    setTiles(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const handleMoveTile = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === tiles.length - 1)) return;
    pushUndo();
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const newTiles = [...tiles];
    const temp = newTiles[index];
    newTiles[index] = newTiles[targetIdx];
    newTiles[targetIdx] = temp;
    // Reindex
    newTiles.forEach((t, i) => { t.index = i; });
    setTiles(newTiles);
  };

  const handleAddTile = () => {
    pushUndo();
    const newIndex = tiles.length;
    const newTile: BoardTileDTO = {
      id: `tile-custom-${Date.now()}`,
      index: newIndex,
      name: `Custom Tile ${newIndex + 1}`,
      type: 'PROPERTY',
      colorGroup: '#3b82f6',
      district: 'Expansion District',
      description: 'Host created custom tile',
      imageUrl: null,
      imageFit: 'cover',
      price: 200,
      baseRent: 20,
      rentLevel1: 50,
      rentLevel2: 100,
      rentLevel3: 200,
      upgradeCost: 120,
      canBuy: true,
      canTrade: true,
      isEnabled: true
    };
    setTiles(prev => [...prev, newTile]);
    setSelectedTileId(newTile.id);
  };

  const handleDeleteTile = (id: string) => {
    const tile = tiles.find(t => t.id === id);
    if (tile?.type === 'START') {
      alert('Cannot delete the START tile.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${tile?.name}"?`)) return;
    pushUndo();
    const filtered = tiles.filter(t => t.id !== id);
    filtered.forEach((t, i) => { t.index = i; });
    setTiles(filtered);
    if (selectedTileId === id) {
      setSelectedTileId(filtered[0]?.id || '');
    }
  };

  // ================= PHOTO UPLOAD =================
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    try {
      setIsUploading(true);
      const res = await api.uploadPhoto(file);
      if (res.success && res.image) {
        setUploadedPhotos(prev => [res.image, ...prev]);
        if (selectedTileId) {
          handleUpdateTile(selectedTileId, { imageUrl: res.image.url });
        }
        soundFX.playCash();
      }
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleAssignPhotoToTile = (imageUrl: string | null, targetTileId?: string) => {
    const id = targetTileId || selectedTileId;
    if (!id) return;
    handleUpdateTile(id, { imageUrl });
    soundFX.playClick();
  };

  const handleTileDirectUpload = async (tileId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    try {
      setIsUploading(true);
      const res = await api.uploadPhoto(file);
      if (res.success && res.image) {
        setUploadedPhotos(prev => [res.image, ...prev]);
        handleUpdateTile(tileId, { imageUrl: res.image.url });
        soundFX.playCash();
      }
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async (filename: string) => {
    if (!window.confirm('Delete this uploaded photograph?')) return;
    try {
      await api.deletePhoto(filename);
      setUploadedPhotos(prev => prev.filter(p => p.filename !== filename && p.id !== filename));
      soundFX.playClick();
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  // ================= SAVE ALL =================
  const handleSaveAll = async () => {
    try {
      setSaveStatus('Saving configuration to database...');
      await api.saveBoardTiles(roomCode, hostSessionId, tiles);
      await api.saveRewards(roomCode, hostSessionId, rewards);
      await api.savePunishments(roomCode, hostSessionId, punishments);
      await api.saveRules(roomCode, hostSessionId, rules);

      const userIdent = googleUser?.email || googleUser?.sub;
      const previousTemplate = await api.getDefaultTemplate(userIdent);
      const tplName = customTemplateName.trim() || previousTemplate?.name || 'My Custom Board';
      const userTplId = (previousTemplate?.id && previousTemplate.id !== 'default-expanded-48')
        ? previousTemplate.id
        : (googleUser?.email ? `tpl-user-${googleUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : undefined);

      const savedTemplate = await api.saveTemplate({
        name: tplName,
        description: `Host saved board template${googleUser?.email ? ` (${googleUser.email})` : ''}`,
        tiles,
        rewards,
        punishments,
        rules,
        existingId: userTplId,
        userId: googleUser?.sub,
        userEmail: googleUser?.email
      });
      if (savedTemplate?.template) {
        localStorage.setItem('polyrich_custom_template', JSON.stringify(savedTemplate.template));
        if (googleUser?.email) {
          localStorage.setItem(`polyrich_board_${googleUser.email.toLowerCase()}`, JSON.stringify(savedTemplate.template));
        }
      }

      const val = await api.validateBoard(roomCode);
      setValidationReport(val);

      const customPhotoCount = tiles.filter(t => !!t.imageUrl).length;
      setSaveStatus(`✓ Board "${tplName}" (${customPhotoCount} custom photos) successfully saved and synced!`);
      soundFX.playCash();
      onSaved(tiles, rewards, punishments, rules);
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err: any) {
      setSaveStatus(`Error saving: ${err.message}`);
    }
  };

  const currentSelectedTile = tiles.find(t => t.id === selectedTileId) || tiles[0];

  const previewState: PublicGameState = {
    roomCode,
    status: 'PLAYING',
    currentTurnIdx: 0,
    activePlayerId: 'preview-player-1',
    boardTiles: tiles,
    players: [
      {
        id: 'preview-player-1',
        sessionId: hostSessionId,
        name: googleUser?.name || 'You (Host)',
        avatar: 'token-1',
        color: '#6366f1',
        money: rules.startingCash || 1500,
        position: 0,
        inJail: false,
        jailTurns: 0,
        isBankrupt: false,
        isConnected: true,
        orderIndex: 0,
        propertyCount: tiles.filter(t => t.ownerId === 'preview-player-1').length,
        isReady: true,
        isHost: true,
        netWorth: rules.startingCash || 1500
      }
    ],
    dice: [3, 4],
    lastRollTotal: 7,
    actionStage: 'AWAITING_ROLL',
    currentRound: 1,
    rewards,
    punishments,
    rules,
    transactions: [],
    activePopup: null,
    turnExpiresAt: null,
    winner: null
  };

  const tabs = [
    { id: 1, label: '1. Board Layout', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 2, label: '2. Cities & Locations', icon: <MapPin className="w-4 h-4" /> },
    { id: 3, label: '3. City Images', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 4, label: '4. Property Prices & Rent', icon: <DollarSign className="w-4 h-4" /> },
    { id: 5, label: '5. Rewards', icon: <Gift className="w-4 h-4" /> },
    { id: 6, label: '6. Punishments', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 7, label: '7. Special Tiles', icon: <Sparkles className="w-4 h-4" /> },
    { id: 8, label: '8. Game Rules', icon: <Sliders className="w-4 h-4" /> },
    { id: 9, label: '9. Player Settings', icon: <Users className="w-4 h-4" /> },
    { id: 10, label: '10. Preview & Publish', icon: <CheckCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0e1b] text-slate-100 overflow-hidden font-sans">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#11162b] border-b border-[#232b4a] shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/40">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white tracking-wide">
                Board & Game Editor
              </h1>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/30">
                HOST ADMIN
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Room <span className="font-mono font-bold text-indigo-400">{roomCode}</span> • {tiles.length} Total Tiles ({tiles.length >= 48 ? 'Expanded +8 Tiles' : 'Standard'})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {undoStack.length > 0 && (
            <button
              onClick={handleUndo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Undo last edit"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Undo
            </button>
          )}

          <button
            onClick={() => { soundFX.playClick(); setIsPreviewOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-indigo-600/90 hover:bg-indigo-500 text-white border border-indigo-400/40 shadow-md transition active:scale-95"
            title="Preview live 2D board with uploaded photos and prices"
          >
            <Eye className="w-4 h-4 text-amber-300" /> Preview Board
          </button>

          <button
            onClick={handleSaveAll}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white shadow-emerald-900/40 shadow-lg transition active:scale-95"
          >
            <Save className="w-4 h-4" /> Save Board
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            title="Close editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Save Status Notification Banner */}
      {saveStatus && (
        <div className="bg-indigo-900/60 border-b border-indigo-700/50 px-4 py-1.5 text-xs text-indigo-200 flex items-center justify-between">
          <span>{saveStatus}</span>
          <button onClick={() => setSaveStatus(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Main Container: Left Tabs Navigation + Center Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Tabs Column */}
        <div className="w-56 sm:w-64 bg-[#0d1021] border-r border-[#202744] flex flex-col p-2 gap-1 overflow-y-auto shrink-0 select-none">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-2">
            Configuration Tabs
          </span>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); soundFX.playClick(); }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
              {activeTab === tab.id && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />}
            </button>
          ))}
        </div>

        {/* Tab Content Panel */}
        <div className="flex-1 bg-[#090b16] p-4 sm:p-6 overflow-y-auto">
          {/* ================= TAB 1: BOARD LAYOUT ================= */}
          {activeTab === 1 && (
            <div className="flex flex-col gap-4 max-w-5xl mx-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-white">Board Layout & Tile Sequencing</h2>
                  <p className="text-xs text-slate-400">
                    Reorder, add, duplicate, or delete tiles. Square perimeter arrangement: 4 corners with {Math.floor(tiles.length / 4) - 1} spaces per side.
                  </p>
                </div>
                <button
                  onClick={handleAddTile}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition"
                >
                  <Plus className="w-4 h-4" /> Add Tile
                </button>
              </div>

              {/* Tile Sequence List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {tiles.map((tile, idx) => {
                  const isCorner = idx % Math.max(1, Math.floor(tiles.length / 4)) === 0;
                  return (
                    <div
                      key={tile.id}
                      onClick={() => setSelectedTileId(tile.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                        selectedTileId === tile.id
                          ? 'bg-[#181e3a] border-indigo-500 shadow-md ring-1 ring-indigo-500'
                          : 'bg-[#11152a] border-[#222a49] hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isCorner ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {idx}
                        </span>
                        {tile.imageUrl ? (
                          <div className="w-6 h-6 rounded overflow-hidden border border-slate-700 shrink-0">
                            <img src={tile.imageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : tile.colorGroup ? (
                          <div className="w-2.5 h-6 rounded shrink-0" style={{ backgroundColor: tile.colorGroup }} />
                        ) : null}
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-white truncate" title={tile.name}>
                            {tile.name}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate">
                            {tile.type} {tile.price > 0 ? `• ₹${tile.price}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveTile(idx, 'up'); }}
                          disabled={idx === 0}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 disabled:opacity-20"
                          title="Move earlier in turn sequence"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveTile(idx, 'down'); }}
                          disabled={idx === tiles.length - 1}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 disabled:opacity-20"
                          title="Move later in turn sequence"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteTile(tile.id); }}
                          disabled={tile.type === 'START'}
                          className="p-1 rounded hover:bg-rose-950 text-rose-400 disabled:opacity-20"
                          title="Delete tile"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= TAB 2: CITIES & LOCATIONS ================= */}
          {activeTab === 2 && currentSelectedTile && (
            <div className="max-w-4xl mx-auto flex flex-col gap-5">
              <div className="pb-3 border-b border-slate-800">
                <h2 className="text-lg font-bold text-white">Cities & Locations Manager</h2>
                <p className="text-xs text-slate-400">
                  Select a location from the board to edit its name, district, description, and properties.
                </p>
              </div>

              {/* Selector Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800/80">
                {tiles.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTileId(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                      selectedTileId === t.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>#{t.index} {t.name}</span>
                    {t.imageUrl && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Has custom image" />}
                  </button>
                ))}
              </div>

              {/* Edit Form */}
              <div className="bg-[#11152a] rounded-2xl border border-[#232b4b] p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    City / Location Name
                  </label>
                  <input
                    type="text"
                    value={currentSelectedTile.name}
                    onChange={(e) => handleUpdateTile(currentSelectedTile.id, { name: e.target.value })}
                    className="w-full bg-[#0a0d1a] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Enter city name..."
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Tile Type
                  </label>
                  <select
                    value={currentSelectedTile.type}
                    onChange={(e) => handleUpdateTile(currentSelectedTile.id, { 
                      type: e.target.value as any,
                      canBuy: e.target.value === 'PROPERTY'
                    })}
                    className="w-full bg-[#0a0d1a] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="START">START (Pass Bonus)</option>
                    <option value="PROPERTY">Property / City</option>
                    <option value="REWARD">Reward</option>
                    <option value="PUNISHMENT">Punishment</option>
                    <option value="TAX">Tax / City Fee</option>
                    <option value="JAIL">Jail / Visiting</option>
                    <option value="CHANCE">Random Event / Chance</option>
                    <option value="TRANS">Transit Station / Utility</option>
                    <option value="BONUS">Rest Oasis / Bonus</option>
                    <option value="MOVE_TO">Move To Destination</option>
                    <option value="CUSTOM">Custom Event</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    District / Color Group Name
                  </label>
                  <input
                    type="text"
                    value={currentSelectedTile.district || ''}
                    onChange={(e) => handleUpdateTile(currentSelectedTile.id, { district: e.target.value })}
                    className="w-full bg-[#0a0d1a] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Marina District, Tech Park..."
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    District Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentSelectedTile.colorGroup || '#3b82f6'}
                      onChange={(e) => handleUpdateTile(currentSelectedTile.id, { colorGroup: e.target.value })}
                      className="w-10 h-9 rounded-lg bg-transparent cursor-pointer border border-slate-700"
                    />
                    <input
                      type="text"
                      value={currentSelectedTile.colorGroup || '#3b82f6'}
                      onChange={(e) => handleUpdateTile(currentSelectedTile.id, { colorGroup: e.target.value })}
                      className="flex-1 bg-[#0a0d1a] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Short Description / Flavor Text
                  </label>
                  <textarea
                    rows={2}
                    value={currentSelectedTile.description || ''}
                    onChange={(e) => handleUpdateTile(currentSelectedTile.id, { description: e.target.value })}
                    className="w-full bg-[#0a0d1a] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Enter short description or history of this location..."
                  />
                </div>

                {/* Direct Image Upload & Customization for Selected Tile */}
                <div className="md:col-span-2 bg-[#0a0d1a] border border-slate-700/80 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-14 h-14 rounded-lg bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                      {currentSelectedTile.imageUrl ? (
                        <img 
                          src={currentSelectedTile.imageUrl} 
                          alt="tile" 
                          className={`w-full h-full ${currentSelectedTile.imageFit === 'contain' ? 'object-contain' : 'object-cover'}`} 
                        />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Tile Photo & Graphic</span>
                      <span className="text-[11px] text-slate-400">Customize this tile's image directly</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <select
                      value={currentSelectedTile.imageFit || 'cover'}
                      onChange={(e) => handleUpdateTile(currentSelectedTile.id, { imageFit: e.target.value as any })}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300"
                    >
                      <option value="cover">Fit: Cover</option>
                      <option value="contain">Fit: Contain</option>
                    </select>

                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-sm transition">
                      <Upload className="w-3.5 h-3.5" />
                      {isUploading ? 'Uploading...' : 'Upload'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => handleTileDirectUpload(currentSelectedTile.id, e)}
                        disabled={isUploading}
                      />
                    </label>

                    {currentSelectedTile.imageUrl && (
                      <button
                        onClick={() => handleUpdateTile(currentSelectedTile.id, { imageUrl: null })}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/60 text-rose-400 border border-rose-800/40 hover:bg-rose-900 transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 md:col-span-2 pt-2 border-t border-slate-800">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSelectedTile.canBuy}
                      onChange={(e) => handleUpdateTile(currentSelectedTile.id, { canBuy: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0"
                    />
                    Enable Property Purchasing
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentSelectedTile.canTrade}
                      onChange={(e) => handleUpdateTile(currentSelectedTile.id, { canTrade: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0"
                    />
                    Enable Trading Between Players
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: CITY IMAGES ================= */}
          {activeTab === 3 && (
            <div className="max-w-4xl mx-auto flex flex-col gap-6">
              {/* Header */}
              <div className="pb-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-indigo-400" /> City & Location Photo Manager
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Upload and manage custom photographs for all cities and properties. Photographs appear on board tiles, deed modals, and property cards.
                  </p>
                </div>
                <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-md transition self-start sm:self-auto shrink-0">
                  <Upload className="w-4 h-4" />
                  {isUploading ? 'Uploading...' : 'Upload New Photo'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>

              {/* 1. City / Tile Selector Dropdown */}
              <div className="bg-[#11152a] rounded-2xl border border-[#232b4b] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Select City / Tile to Customize Image:
                  </label>
                  <select
                    value={selectedTileId}
                    onChange={(e) => {
                      setSelectedTileId(e.target.value);
                      setImageInputUrl('');
                    }}
                    className="w-full bg-[#0a0d1a] border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:border-indigo-500 focus:outline-none"
                  >
                    {tiles.map((t) => (
                      <option key={t.id} value={t.id}>
                        #{t.index} — {t.name} ({t.type === 'PROPERTY' ? `${t.district || 'City'} • ₹${t.price}` : t.type}) {t.imageUrl ? '✓ Has Image' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-400">Total Cities with Images:</span>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                    {tiles.filter(t => !!t.imageUrl).length} / {tiles.length}
                  </span>
                </div>
              </div>

              {/* 2. Active Tile Customization Studio */}
              {currentSelectedTile && (
                <div className="bg-[#11152a] rounded-2xl border border-indigo-500/40 p-4 sm:p-5 flex flex-col gap-4 shadow-xl relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl bg-slate-900 border-2 border-slate-700 overflow-hidden flex items-center justify-center shrink-0 shadow-md">
                        {currentSelectedTile.imageUrl ? (
                          <img 
                            src={currentSelectedTile.imageUrl} 
                            alt={currentSelectedTile.name} 
                            className={`w-full h-full ${currentSelectedTile.imageFit === 'contain' ? 'object-contain' : 'object-cover'}`} 
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                            Tile #{currentSelectedTile.index}
                          </span>
                          <span className="text-sm font-extrabold text-white">{currentSelectedTile.name}</span>
                          {currentSelectedTile.colorGroup && (
                            <span 
                              className="w-3.5 h-3.5 rounded-full border border-white/60 inline-block" 
                              style={{ backgroundColor: currentSelectedTile.colorGroup }} 
                            />
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-1">
                          {currentSelectedTile.imageUrl ? '✓ Custom image is active on board & property deed' : 'No image currently assigned to this tile'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <select
                        value={currentSelectedTile.imageFit || 'cover'}
                        onChange={(e) => handleUpdateTile(currentSelectedTile.id, { imageFit: e.target.value as any })}
                        className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-medium"
                      >
                        <option value="cover">Fit: Cover (fills tile)</option>
                        <option value="contain">Fit: Contain (uncropped)</option>
                      </select>

                      {currentSelectedTile.imageUrl && (
                        <button
                          onClick={() => handleAssignPhotoToTile(null)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/70 text-rose-300 border border-rose-800/50 hover:bg-rose-900 transition"
                        >
                          Remove Image
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Upload & URL Assignment Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {/* Direct Upload for this tile */}
                    <div className="bg-[#0a0d1a] border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-white block">Upload Image for this City</span>
                        <span className="text-[10px] text-slate-400">JPG, PNG, or WebP from your computer</span>
                      </div>
                      <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow transition shrink-0 active:scale-95">
                        <Upload className="w-3.5 h-3.5" />
                        {isUploading ? 'Uploading...' : 'Choose File'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => handleTileDirectUpload(currentSelectedTile.id, e)}
                          disabled={isUploading}
                        />
                      </label>
                    </div>

                    {/* Or Paste Web Image URL */}
                    <div className="bg-[#0a0d1a] border border-slate-800 rounded-xl p-3 flex items-center gap-2">
                      <input
                        type="url"
                        placeholder="Or paste image URL (https://...)"
                        value={imageInputUrl}
                        onChange={(e) => setImageInputUrl(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={() => {
                          if (!imageInputUrl.trim()) return;
                          handleUpdateTile(currentSelectedTile.id, { imageUrl: imageInputUrl.trim() });
                          setImageInputUrl('');
                          soundFX.playCash();
                        }}
                        disabled={!imageInputUrl.trim()}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-indigo-600 text-white transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                      >
                        Apply URL
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Uploaded Image Library Grid */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-indigo-400" /> Uploaded Image Library ({uploadedPhotos.length})
                  </span>
                  <span className="text-[11px] text-slate-400">Click any image to assign to active city</span>
                </div>

                {uploadedPhotos.length === 0 ? (
                  <div className="p-8 text-center bg-[#11152a] border border-dashed border-slate-800 rounded-2xl">
                    <ImageIcon className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-400">No photographs in library yet.</p>
                    <p className="text-xs text-slate-500 mt-1">Upload photos to assign them to cities and properties on your custom board.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {uploadedPhotos.map((photo) => {
                      const assignedTiles = tiles.filter(t => t.imageUrl === photo.url);
                      return (
                        <div
                          key={photo.id}
                          className="rounded-xl overflow-hidden border border-slate-800 bg-[#11152a] shadow-md flex flex-col justify-between hover:border-slate-700 transition"
                        >
                          <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                            <img 
                              src={photo.url} 
                              alt={photo.originalName} 
                              className="w-full h-full object-cover" 
                            />
                            {assignedTiles.length > 0 && (
                              <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-900/90 text-indigo-200 border border-indigo-700/60 shadow">
                                On #{assignedTiles.map(t => t.index).join(', #')}
                              </span>
                            )}
                            <button
                              onClick={() => handleDeletePhoto(photo.filename)}
                              className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 hover:bg-rose-900/90 text-slate-300 hover:text-white transition"
                              title="Delete photo from server"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="p-2.5 flex flex-col gap-2">
                            <span className="text-[11px] text-slate-200 truncate font-semibold block" title={photo.originalName}>
                              {photo.originalName}
                            </span>

                            <button
                              onClick={() => handleAssignPhotoToTile(photo.url)}
                              className="w-full py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition active:scale-95 flex items-center justify-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" /> Assign to #{currentSelectedTile?.index} ({currentSelectedTile?.name})
                            </button>

                            {/* Or assign to other tile */}
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAssignPhotoToTile(photo.url, e.target.value);
                                  e.target.value = '';
                                }
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-slate-300 focus:outline-none"
                            >
                              <option value="" disabled>Assign to another city...</option>
                              {tiles.map((t) => (
                                <option key={t.id} value={t.id}>
                                  #{t.index} {t.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 4: PROPERTY PRICES & RENT ================= */}
          {activeTab === 4 && (
            <div className="max-w-4xl mx-auto flex flex-col gap-5">
              <div className="pb-3 border-b border-slate-800">
                <h2 className="text-lg font-bold text-white">Property Prices & Rent Configuration</h2>
                <p className="text-xs text-slate-400">
                  Configure purchase prices, base rent, tiered upgrade rents, and development costs for all properties.
                </p>
              </div>

              <div className="overflow-x-auto bg-[#11152a] rounded-2xl border border-[#232b4b]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0e1224] text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Property</th>
                      <th className="p-3">Buy Price</th>
                      <th className="p-3">Base Rent</th>
                      <th className="p-3">Tier 1 Rent</th>
                      <th className="p-3">Tier 2 Rent</th>
                      <th className="p-3">Tier 3 Rent</th>
                      <th className="p-3">Develop Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {tiles.filter(t => t.type === 'PROPERTY').map(tile => (
                      <tr key={tile.id} className="hover:bg-slate-800/30">
                        <td className="p-3 font-mono text-slate-500">{tile.index}</td>
                        <td className="p-3 font-medium text-white flex items-center gap-1.5">
                          {tile.colorGroup && (
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tile.colorGroup }} />
                          )}
                          {tile.name}
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={tile.price}
                            onChange={(e) => handleUpdateTile(tile.id, { price: parseInt(e.target.value) || 0 })}
                            className="w-20 bg-[#0a0d1a] border border-slate-700 rounded px-2 py-1 text-emerald-400 font-bold"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={tile.baseRent}
                            onChange={(e) => handleUpdateTile(tile.id, { baseRent: parseInt(e.target.value) || 0 })}
                            className="w-16 bg-[#0a0d1a] border border-slate-700 rounded px-2 py-1 text-slate-200"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={tile.rentLevel1}
                            onChange={(e) => handleUpdateTile(tile.id, { rentLevel1: parseInt(e.target.value) || 0 })}
                            className="w-16 bg-[#0a0d1a] border border-slate-700 rounded px-2 py-1 text-slate-200"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={tile.rentLevel2}
                            onChange={(e) => handleUpdateTile(tile.id, { rentLevel2: parseInt(e.target.value) || 0 })}
                            className="w-16 bg-[#0a0d1a] border border-slate-700 rounded px-2 py-1 text-slate-200"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={tile.rentLevel3}
                            onChange={(e) => handleUpdateTile(tile.id, { rentLevel3: parseInt(e.target.value) || 0 })}
                            className="w-16 bg-[#0a0d1a] border border-slate-700 rounded px-2 py-1 text-amber-400 font-bold"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={tile.upgradeCost}
                            onChange={(e) => handleUpdateTile(tile.id, { upgradeCost: parseInt(e.target.value) || 0 })}
                            className="w-16 bg-[#0a0d1a] border border-slate-700 rounded px-2 py-1 text-slate-400"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 5: REWARDS ================= */}
          {activeTab === 5 && (
            <div className="max-w-4xl mx-auto flex flex-col gap-5">
              <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Custom Rewards Manager</h2>
                  <p className="text-xs text-slate-400">
                    Add unlimited custom rewards, monetary bonuses, extra turns, and forward leaps.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newReward: RewardDTO = {
                      id: `rew-${Date.now()}`,
                      name: 'Super Bonus Prize',
                      description: 'You won a lottery jackpot! Collect ₹200.',
                      moneyGain: 200,
                      movementSpaces: 0,
                      bonusTurn: false,
                      execution: 'AUTO'
                    };
                    setRewards(prev => [...prev, newReward]);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow"
                >
                  <Plus className="w-4 h-4" /> Add Reward
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rewards.map((rew, idx) => (
                  <div key={rew.id} className="bg-[#11152a] rounded-2xl border border-[#232b4b] p-4 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={rew.name}
                        onChange={(e) => {
                          const updated = [...rewards];
                          updated[idx].name = e.target.value;
                          setRewards(updated);
                        }}
                        className="bg-transparent font-bold text-sm text-white border-b border-transparent hover:border-slate-600 focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        onClick={() => setRewards(prev => prev.filter((_, i) => i !== idx))}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <textarea
                      rows={2}
                      value={rew.description}
                      onChange={(e) => {
                        const updated = [...rewards];
                        updated[idx].description = e.target.value;
                        setRewards(updated);
                      }}
                      className="w-full bg-[#0a0d1a] border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                    />

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Money Gain (₹)</span>
                        <input
                          type="number"
                          value={rew.moneyGain}
                          onChange={(e) => {
                            const updated = [...rewards];
                            updated[idx].moneyGain = parseInt(e.target.value) || 0;
                            setRewards(updated);
                          }}
                          className="w-full bg-[#0a0d1a] border border-slate-800 rounded px-2 py-1 text-emerald-400 font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Move Spaces</span>
                        <input
                          type="number"
                          value={rew.movementSpaces}
                          onChange={(e) => {
                            const updated = [...rewards];
                            updated[idx].movementSpaces = parseInt(e.target.value) || 0;
                            setRewards(updated);
                          }}
                          className="w-full bg-[#0a0d1a] border border-slate-800 rounded px-2 py-1 text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-1 border-t border-slate-800/80 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={rew.bonusTurn}
                          onChange={(e) => {
                            const updated = [...rewards];
                            updated[idx].bonusTurn = e.target.checked;
                            setRewards(updated);
                          }}
                          className="w-3.5 h-3.5 rounded text-emerald-600 bg-slate-900 border-slate-700"
                        />
                        Grant Bonus Turn
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= TAB 6: PUNISHMENTS ================= */}
          {activeTab === 6 && (
            <div className="max-w-4xl mx-auto flex flex-col gap-5">
              <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Custom Punishments Manager</h2>
                  <p className="text-xs text-slate-400">
                    Define custom penalties, fines payable to bank or players, skip turns, and setbacks.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newPunish: PunishmentDTO = {
                      id: `pun-${Date.now()}`,
                      name: 'Corporate Audit',
                      description: 'Tax discrepancy found. Pay ₹100 fine to the bank.',
                      moneyLoss: 100,
                      fineRecipient: 'BANK',
                      movementSpaces: 0,
                      skipTurns: 0,
                      execution: 'AUTO'
                    };
                    setPunishments(prev => [...prev, newPunish]);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow"
                >
                  <Plus className="w-4 h-4" /> Add Punishment
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {punishments.map((pun, idx) => (
                  <div key={pun.id} className="bg-[#11152a] rounded-2xl border border-[#232b4b] p-4 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={pun.name}
                        onChange={(e) => {
                          const updated = [...punishments];
                          updated[idx].name = e.target.value;
                          setPunishments(updated);
                        }}
                        className="bg-transparent font-bold text-sm text-white border-b border-transparent hover:border-slate-600 focus:border-rose-500 focus:outline-none"
                      />
                      <button
                        onClick={() => setPunishments(prev => prev.filter((_, i) => i !== idx))}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <textarea
                      rows={2}
                      value={pun.description}
                      onChange={(e) => {
                        const updated = [...punishments];
                        updated[idx].description = e.target.value;
                        setPunishments(updated);
                      }}
                      className="w-full bg-[#0a0d1a] border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-rose-500"
                    />

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Fine (₹)</span>
                        <input
                          type="number"
                          value={pun.moneyLoss}
                          onChange={(e) => {
                            const updated = [...punishments];
                            updated[idx].moneyLoss = parseInt(e.target.value) || 0;
                            setPunishments(updated);
                          }}
                          className="w-full bg-[#0a0d1a] border border-slate-800 rounded px-2 py-1 text-rose-400 font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Recipient</span>
                        <select
                          value={pun.fineRecipient}
                          onChange={(e) => {
                            const updated = [...punishments];
                            updated[idx].fineRecipient = e.target.value as any;
                            setPunishments(updated);
                          }}
                          className="w-full bg-[#0a0d1a] border border-slate-800 rounded px-2 py-1 text-slate-200"
                        >
                          <option value="BANK">Bank</option>
                          <option value="NEXT_PLAYER">Next Player</option>
                          <option value="ALL_PLAYERS">All Players</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Skip Turns</span>
                        <input
                          type="number"
                          value={pun.skipTurns}
                          onChange={(e) => {
                            const updated = [...punishments];
                            updated[idx].skipTurns = parseInt(e.target.value) || 0;
                            setPunishments(updated);
                          }}
                          className="w-full bg-[#0a0d1a] border border-slate-800 rounded px-2 py-1 text-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= TAB 7: SPECIAL TILES & EVENTS ================= */}
          {activeTab === 7 && (
            <div className="max-w-4xl mx-auto flex flex-col gap-5">
              <div className="pb-3 border-b border-slate-800">
                <h2 className="text-lg font-bold text-white">Special Tiles & Corners Configuration</h2>
                <p className="text-xs text-slate-400">
                  Corner tiles anchor the 4 edges of the board. Configure Start bonus, Detention rules, and Rest oasis.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#11152a] rounded-2xl border border-emerald-500/30 p-4">
                  <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold text-sm">
                    <Sparkles className="w-4 h-4" /> Corner #0: START Tile
                  </div>
                  <p className="text-xs text-slate-300 mb-3">
                    Awarded every time a player passes or lands on space #0.
                  </p>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Passing Bonus Amount (₹)</label>
                    <input
                      type="number"
                      value={rules.passStartBonus}
                      onChange={(e) => setRules(prev => ({ ...prev, passStartBonus: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-[#0a0d1a] border border-slate-700 rounded-xl px-3 py-2 text-emerald-400 font-bold"
                    />
                  </div>
                </div>

                <div className="bg-[#11152a] rounded-2xl border border-amber-500/30 p-4">
                  <div className="flex items-center gap-2 mb-2 text-amber-400 font-bold text-sm">
                    <Sparkles className="w-4 h-4" /> Corner #12: JAIL / VISITING
                  </div>
                  <p className="text-xs text-slate-300 mb-3">
                    Players landing normally are "Just Visiting". Arrested players must roll doubles or serve detention turns.
                  </p>
                  <span className="text-xs text-amber-300 font-medium">Position anchored at index 12</span>
                </div>

                <div className="bg-[#11152a] rounded-2xl border border-blue-500/30 p-4">
                  <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold text-sm">
                    <Sparkles className="w-4 h-4" /> Corner #24: REST OASIS
                  </div>
                  <p className="text-xs text-slate-300 mb-3">
                    Safe parking zone. No charges or penalties incurred.
                  </p>
                  <span className="text-xs text-blue-300 font-medium">Position anchored at index 24</span>
                </div>

                <div className="bg-[#11152a] rounded-2xl border border-rose-500/30 p-4">
                  <div className="flex items-center gap-2 mb-2 text-rose-400 font-bold text-sm">
                    <Sparkles className="w-4 h-4" /> Corner #36: GO TO JAIL
                  </div>
                  <p className="text-xs text-slate-300 mb-3">
                    Directly moves player to Jail without passing START.
                  </p>
                  <span className="text-xs text-rose-300 font-medium">Position anchored at index 36</span>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 8: GAME RULES ================= */}
          {activeTab === 8 && (
            <div className="max-w-4xl mx-auto flex flex-col gap-5">
              <div className="pb-3 border-b border-slate-800">
                <h2 className="text-lg font-bold text-white">Game Rules & Economics</h2>
                <p className="text-xs text-slate-400">
                  Configure economic rules, timers, dice mechanics, and bankruptcy limits.
                </p>
              </div>

              <div className="bg-[#11152a] rounded-2xl border border-[#232b4b] p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Starting Cash Per Player (₹)</label>
                  <input
                    type="number"
                    value={rules.startingCash}
                    onChange={(e) => setRules(prev => ({ ...prev, startingCash: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-[#0a0d1a] border border-slate-700 rounded-xl px-3 py-2 text-sm text-emerald-400 font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Salary Bonus for Passing START (₹)</label>
                  <input
                    type="number"
                    value={rules.passStartBonus}
                    onChange={(e) => setRules(prev => ({ ...prev, passStartBonus: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-[#0a0d1a] border border-slate-700 rounded-xl px-3 py-2 text-sm text-emerald-400 font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Dice Count</label>
                  <select
                    value={rules.diceCount}
                    onChange={(e) => setRules(prev => ({ ...prev, diceCount: parseInt(e.target.value) }))}
                    className="w-full bg-[#0a0d1a] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value={1}>1 Die (6-sided)</option>
                    <option value={2}>2 Dice (Classic Doubles)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Turn Timer</label>
                  <select
                    value={rules.turnTimerSec}
                    onChange={(e) => setRules(prev => ({ ...prev, turnTimerSec: parseInt(e.target.value) }))}
                    className="w-full bg-[#0a0d1a] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value={30}>30 Seconds</option>
                    <option value={45}>45 Seconds (Recommended)</option>
                    <option value={60}>60 Seconds</option>
                    <option value={0}>Unlimited (No timer)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Maximum Game Rounds</label>
                  <input
                    type="number"
                    value={rules.maxRounds}
                    onChange={(e) => setRules(prev => ({ ...prev, maxRounds: parseInt(e.target.value) || 50 }))}
                    className="w-full bg-[#0a0d1a] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-2 md:col-span-2 border-t border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={rules.allowNegativeBalance}
                      onChange={(e) => setRules(prev => ({ ...prev, allowNegativeBalance: e.target.checked }))}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700"
                    />
                    Permit negative balance (No immediate bankruptcy)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={rules.eliminationEnabled}
                      onChange={(e) => setRules(prev => ({ ...prev, eliminationEnabled: e.target.checked }))}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700"
                    />
                    Eliminate players when bankrupt
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={rules.tradingEnabled}
                      onChange={(e) => setRules(prev => ({ ...prev, tradingEnabled: e.target.checked }))}
                      className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700"
                    />
                    Enable property trading between players
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 9: PLAYER SETTINGS ================= */}
          {activeTab === 9 && (
            <div className="max-w-4xl mx-auto flex flex-col gap-5">
              <div className="pb-3 border-b border-slate-800">
                <h2 className="text-lg font-bold text-white">Player Capacity & Settings</h2>
                <p className="text-xs text-slate-400">
                  Up to 6 simultaneous players per room. Each player receives a distinct token color and session token.
                </p>
              </div>

              <div className="bg-[#11152a] rounded-2xl border border-[#232b4b] p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-sm font-semibold text-white">Maximum Room Capacity</span>
                  <span className="text-sm font-bold text-indigo-400">6 Players</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-sm font-semibold text-white">Reconnection Grace Feature</span>
                  <span className="text-xs text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    Active (Session Token Protected)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Host Permission Guard</span>
                  <span className="text-xs text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                    Host Only Controls
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 10: PREVIEW & PUBLISH ================= */}
          {activeTab === 10 && (
            <div className="max-w-4xl mx-auto flex flex-col gap-5">
              <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Preview, Validation & Publish</h2>
                  <p className="text-xs text-slate-400">
                    Validate board layout and lock changes to activate for all players in room {roomCode}.
                  </p>
                </div>
              </div>

              {/* Validation Status Box */}
              {validationReport && (
                <div className={`p-4 rounded-2xl border ${
                  validationReport.valid 
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300' 
                    : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-sm mb-1">
                    {validationReport.valid ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
                    {validationReport.valid ? 'Board Configuration is Valid & Ready!' : 'Validation Issues Detected'}
                  </div>
                  {validationReport.warnings.length > 0 && (
                    <ul className="text-xs list-disc list-inside mt-2 text-amber-300/90">
                      {validationReport.warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                    </ul>
                  )}
                  {validationReport.errors.length > 0 && (
                    <ul className="text-xs list-disc list-inside mt-2 text-rose-300">
                      {validationReport.errors.map((e, idx) => <li key={idx}>{e}</li>)}
                    </ul>
                  )}
                </div>
              )}

              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-[#11152a] rounded-xl p-3 border border-[#232b4b]">
                  <span className="text-[10px] text-slate-400 uppercase">Total Tiles</span>
                  <span className="text-lg font-black text-white block">{tiles.length}</span>
                </div>
                <div className="bg-[#11152a] rounded-xl p-3 border border-[#232b4b]">
                  <span className="text-[10px] text-slate-400 uppercase">Properties</span>
                  <span className="text-lg font-black text-indigo-400 block">
                    {tiles.filter(t => t.type === 'PROPERTY').length}
                  </span>
                </div>
                <div className="bg-[#11152a] rounded-xl p-3 border border-[#232b4b]">
                  <span className="text-[10px] text-slate-400 uppercase">Custom Rewards</span>
                  <span className="text-lg font-black text-emerald-400 block">{rewards.length}</span>
                </div>
                <div className="bg-[#11152a] rounded-xl p-3 border border-[#232b4b]">
                  <span className="text-[10px] text-slate-400 uppercase">Punishments</span>
                  <span className="text-lg font-black text-rose-400 block">{punishments.length}</span>
                </div>
              </div>

              {/* Reusable Template Saver Box */}
              <div className="bg-[#11152a] p-4 rounded-2xl border border-indigo-500/30 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">
                      Permanent Cloud Storage
                    </span>
                    <h4 className="text-sm font-black text-white">
                      Save as Reusable Board Template
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Save your custom cities, uploaded photos, rewards, punishments, and rules permanently. All future rooms you create will automatically load this board!
                    </p>
                    {googleUser && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium mt-1">
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Linked to Google Account: {googleUser.email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-slate-800/80">
                  <div className="w-full sm:flex-1">
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Board Template Name
                    </label>
                    <input
                      type="text"
                      value={customTemplateName}
                      onChange={(e) => setCustomTemplateName(e.target.value)}
                      placeholder="e.g. World Tour Edition, Pune Mogul 2026..."
                      className="w-full bg-[#0a0d1a] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      const tName = customTemplateName.trim() || 'My Custom Board';
                      try {
                        const userIdent = googleUser?.email || googleUser?.sub;
                        const previousTemplate = await api.getDefaultTemplate(userIdent);
                        const userTplId = (previousTemplate?.id && previousTemplate.id !== 'default-expanded-48')
                          ? previousTemplate.id
                          : (googleUser?.email ? `tpl-user-${googleUser.email.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : undefined);

                        const savedTpl = await api.saveTemplate({
                          name: tName,
                          description: `Host custom board template${googleUser?.email ? ` (${googleUser.email})` : ''}`,
                          tiles,
                          rewards,
                          punishments,
                          rules,
                          existingId: userTplId,
                          userId: googleUser?.sub,
                          userEmail: googleUser?.email
                        });
                        if (savedTpl?.template) {
                          localStorage.setItem('polyrich_custom_template', JSON.stringify(savedTpl.template));
                          if (googleUser?.email) {
                            localStorage.setItem(`polyrich_board_${googleUser.email.toLowerCase()}`, JSON.stringify(savedTpl.template));
                          }
                        }
                        soundFX.playCash();
                        setSaveStatus(`✓ Template "${tName}" saved! Future rooms will automatically load this board.`);
                        onSaved(tiles, rewards, punishments, rules);
                        setTimeout(() => setSaveStatus(null), 4000);
                      } catch (err: any) {
                        alert(`Error saving template: ${err.message}`);
                      }
                    }}
                    className="w-full sm:w-auto mt-4 sm:mt-0 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-slate-950 shadow-gold transition active:scale-95 shrink-0 flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Template for Future Games
                  </button>
                </div>
              </div>

              {/* Inline Board Preview Section */}
              <div className="bg-[#11152a] p-4 rounded-2xl border border-[#232b4b] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Live 2D Board Preview
                    </span>
                  </div>
                  <button
                    onClick={() => setIsPreviewOpen(true)}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/50 transition"
                  >
                    Open Fullscreen Preview
                  </button>
                </div>
                <div className="w-full max-w-[580px] aspect-square mx-auto p-2 bg-[#070914] rounded-2xl border border-slate-800/80 shadow-inner flex items-center justify-center">
                  <BoardGrid
                    state={previewState}
                    currentPlayer={previewState.players[0]}
                    onRollDice={() => {}}
                    onBuyProperty={() => {}}
                    onSkipPurchase={() => {}}
                    onEndTurn={() => {}}
                    onTileClick={(tile) => setSelectedTileId(tile.id)}
                    soundEnabled={false}
                    onToggleSound={() => {}}
                    displayedPositions={{ 'preview-player': 0 }}
                    hoppingPlayerId={null}
                    isPawnMoving={false}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSaveAll}
                  className="flex-1 py-3 px-6 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 text-white shadow-emerald-900/40 shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> Save Board for Current Room
                </button>

                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-6 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
                >
                  Return to Lobby / Game <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= LIVE BOARD PREVIEW MODAL ================= */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
          <div className="w-full max-w-4xl max-h-[96vh] bg-[#0c0f22] border border-[#232b4b] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-3 sm:p-4 bg-[#11152a] border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    Board Preview: {customTemplateName || 'My Custom Board'}
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {tiles.length} Tiles • {tiles.filter(t => !!t.imageUrl).length} Photos
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Live view of your customized 2D board with uploaded photos and prices as players will see it.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Board Grid */}
            <div className="flex-1 p-2 sm:p-4 overflow-auto flex items-center justify-center min-h-0 bg-[#070914]">
              <div className="w-full max-w-[min(90vw,calc(90vh-140px),720px)] aspect-square">
                <BoardGrid
                  state={previewState}
                  currentPlayer={previewState.players[0]}
                  onRollDice={() => {}}
                  onBuyProperty={() => {}}
                  onSkipPurchase={() => {}}
                  onEndTurn={() => {}}
                  onTileClick={(tile) => {
                    setSelectedTileId(tile.id);
                  }}
                  soundEnabled={false}
                  onToggleSound={() => {}}
                  displayedPositions={{ 'preview-player': 0 }}
                  hoppingPlayerId={null}
                  isPawnMoving={false}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#11152a] border-t border-slate-800 flex items-center justify-between shrink-0 text-xs">
              <span className="text-slate-400 text-[11px]">
                Tip: Click any tile in the board to select it for editing.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveAll}
                  className="px-3.5 py-1.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow"
                >
                  <Save className="w-3.5 h-3.5" /> Save Changes
                </button>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
