# PolyRich 2D — Custom 6-Player Multiplayer Board Game

A complete, production-ready, browser-based turn-based multiplayer 2D board game inspired by **Monopoly** and **RichUp.io**, featuring an expanded board layout (+8 tiles / 2 extra per side), user-uploaded city photographs, editable property values, custom rewards, punishments, rules, and real-time Socket.IO synchronization.

---

## 🌟 Key Features

### 1. Expanded Board Layout (+8 Tiles)
- Configurable perimeter square board with **48 tiles** (12 tiles per side).
- **4 Corners:**
  - Index 0: `GO / START` (Pass bonus salary)
  - Index 12: `JAIL / VISITING` (Detention & Escape by doubles)
  - Index 24: `REST OASIS / BONUS` (Free zone)
  - Index 36: `GO TO JAIL` (Arrest & direct transit)
- 44 intermediate tiles featuring unique color districts, transportation hubs, rewards, taxes, and customizable expansion slots.

### 2. Up to 6 Simultaneous Players
- Supports **2 to 6 players** per room.
- Each player receives a distinct token color, avatar initial, and non-overlapping slot offset within tiles.
- Player cards display cash balance, board position, property deeds, and live net worth.
- Real-time status indicators: Current Turn, Host Crown, In Jail, Bankrupt, and Disconnected.

### 3. Most Important Feature: Host Admin Dashboard ("Board & Game Editor")
A complete, visual, host-only dashboard with **10 dedicated tabs**:
1. **Board Layout:** Visual map of all 48 tiles, move up/down sequence controls, add custom tile, delete tile with validation.
2. **Cities & Locations:** Edit city names, districts, color themes, descriptions, and purchase toggles.
3. **City Images:** Visual image manager. Upload your own **JPEG, PNG, WebP** photographs. Associate photos with locations, toggle crop/fit (cover vs. contain), and remove/replace. Clean typography placeholder when no photo is uploaded.
4. **Property Prices & Rent:** Configure purchase price, base rent, tiered upgrade rents (Tiers 1, 2, 3), and development costs.
5. **Rewards:** Unlimited custom rewards manager (monetary gains, movement forward/backward, bonus turns).
6. **Punishments:** Unlimited custom punishments manager (fines to Bank or Next Player, skip turns, destination tiles).
7. **Special Tiles & Events:** Configure START bonus salary, Jail detention rules, and Rest Zone.
8. **Game Rules:** Starting cash ($1500 default), salary bonus ($200 default), dice count (1 or 2 dice), turn timer (30s/45s/60s/unlimited), bankruptcy threshold, elimination rules, and maximum rounds.
9. **Player Settings:** 6-player capacity limit and reconnection grace features.
10. **Preview & Publish:** Live validation engine, Undo history for unsaved edits, and 1-click "Save & Lock Board".

### 4. Image Upload System — User's Own Photos Only
- Fully user-supplied photographs.
- Uploads are saved permanently to the backend disk (`/uploads`) and database.
- Synchronized in real-time across all players in the room.
- Zero AI-generated or stock photo fallbacks.

### 5. Server-Authoritative Engine & Real-Time Multiplayer
- Dice rolling, movement, wraparound, rent calculations (including monopoly double-rent), reward triggers, and bankruptcy validated exclusively on the backend.
- Built-in reconnection support: player identity and session tokens are preserved across page refreshes.
- Synthesized Web Audio API sound effects (dice rolls, cash chimes, penalty buzzers, victory fanfare) with zero external audio file dependencies.
- Confetti victory celebration modal with final net worth standings.

---

## 🚀 Running the Game

### Save a host board for future rooms

In the host editor, use **Save Board** or **Save As Default Template**. The saved default template is stored by the server and loaded for future rooms, including rooms created from another device. Keep the server's `data` storage persistent when deploying; Docker Compose does this with a named volume.

For public HTTPS deployment on a VPS with a domain, follow [DEPLOYMENT.md](DEPLOYMENT.md) and run `docker compose --profile production up -d --build`.

### 1. Servers are Running:
- **Client (Frontend):** [http://localhost:5173](http://localhost:5173)
- **Local Network / Wi-Fi (Multi-Device):** [http://192.168.0.106:5173](http://192.168.0.106:5173)
- **Backend API & WebSockets:** [http://localhost:4000](http://localhost:4000)

### 2. Automated Test Suite:
Run vitest suite in the server directory:
```bash
cd server
npm test
```
**Results:** `13/13 tests passing` (Board tile geometry, wraparound, monopoly rent calculations, rewards & punishments engine, 6-player limit, session reconnects, and host-only permissions).

---

## 📁 Project Structure

```
custom-board-game/
├── client/                      # React 18 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/           # 10-Tab Host Admin Dashboard ("Board & Game Editor")
│   │   │   ├── board/           # BoardGrid, TileView, PlayerToken, CenterPanel
│   │   │   ├── modals/          # EventPopupModal, PropertyDeedModal, WinnerModal
│   │   │   └── players/         # PlayerList, PlayerCard
│   │   ├── pages/               # LobbyPage, GamePage
│   │   ├── services/            # REST API & Socket.IO clients
│   │   ├── utils/               # Web Audio API sound generator
│   │   ├── App.tsx              # Main orchestrator & session reconnection
│   │   └── types/               # Shared TypeScript models
│   └── Dockerfile               # Production Nginx container
├── server/                      # Node.js + Express + TypeScript + Socket.IO
│   ├── prisma/
│   │   └── schema.prisma        # Database schema (SQLite / PostgreSQL)
│   ├── src/
│   │   ├── engine/              # GameEngine (movement, rent, rewards, bankruptcy)
│   │   │   └── defaultBoard.ts  # 48-tile expanded board template
│   │   ├── routes/              # REST API (Room, Host Editor, Photo Uploads)
│   │   ├── services/            # RoomManager (6-player room store & session tracker)
│   │   ├── sockets/             # Socket.IO multiplayer event handlers
│   │   └── index.ts             # Server entry point & static /uploads/
│   ├── test/                    # Vitest automated test suite
│   └── Dockerfile               # Production Node.js container
├── docker-compose.yml           # 1-command deployment
├── DEPLOYMENT.md                # LAN, Cloudflare Tunnel, and Cloud VPS hosting guide
└── README.md
```
