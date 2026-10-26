# Deployment and Multiplayer Hosting Guide

This guide explains how to run and deploy the **Custom 6-Player Multiplayer Board Game (PolyRich)** for local, LAN, and public worldwide multiplayer access.

---

## 1. Local Network (LAN) & Multi-Device Play (Running Right Now)

The application is already running on your machine:
- **Local Browser:** [http://localhost:5173](http://localhost:5173)
- **Local Network / Wi-Fi Devices:** [http://192.168.0.106:5173](http://192.168.0.106:5173)

### How to play with friends on the same Wi-Fi:
1. Open [http://localhost:5173](http://localhost:5173) in your browser as the Host.
2. Click **"Create Room"** and enter your name.
3. Click the **"Invite"** button in the lobby to copy your shareable link.
4. Friends on your home or office Wi-Fi can open that link (or go directly to `http://192.168.0.106:5173` and enter the 6-letter room code).
5. All devices will sync in real-time. Up to 6 players can join simultaneously.

---

## 2. Instant Free Worldwide Internet Access (Cloudflare Tunnel or Ngrok)

To invite players across the internet without setting up a cloud server:

### Option A: Cloudflare Tunnel (Free, No Port Forwarding, Automatic HTTPS)
1. Download `cloudflared` from [cloudflare.com](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
2. Run this single command in your terminal:
   ```bash
   cloudflared tunnel --url http://localhost:5173
   ```
3. Cloudflare will output a public HTTPS URL (e.g. `https://random-words.trycloudflare.com`).
4. Share that link with your friends anywhere in the world! Both the WebSocket and REST endpoints will proxy through seamlessly.

### Option B: Ngrok
```bash
ngrok http 5173
```
Share the generated `https://...ngrok-free.app` URL.

---

## 3. Production HTTPS Deployment (Docker & VPS)

To deploy permanently to a VPS (DigitalOcean, Hetzner, AWS EC2, Linode, Ubuntu):

### Step 1: Prepare a public server and domain

Use a Linux VPS with Docker Engine and Docker Compose installed. Point your domain's DNS `A` record (and `AAAA` record if IPv6 is enabled) to the VPS public IP. Allow inbound TCP ports 80 and 443 in both firewalls. Caddy obtains and renews the HTTPS certificate automatically.

### Step 2: Clone and Enter Directory
```bash
git clone <your-repo>
cd custom-board-game
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Set `DOMAIN` in `.env` to the domain pointed at the VPS, for example `game.example.com`.

### Step 4: Start the public HTTPS site
```bash
docker compose --profile production up -d --build
```

Visit `https://game.example.com`. Caddy terminates HTTPS and forwards requests and Socket.IO WebSocket connections to the Nginx client container. The SQLite database, uploaded photos, and saved default board template are stored in persistent Docker volumes. Back up these volumes regularly.

For a temporary public test URL without a domain, start the stack without the Caddy profile, then run `cloudflared tunnel --url http://localhost:5173` on that machine. Share the HTTPS URL printed by Cloudflare while the tunnel remains running.

---

## 4. Deploying to Cloud Platform (Railway or Render)

### Backend (Node.js + Socket.IO + SQLite/Postgres):
- **Root Directory:** `server`
- **Build Command:** `npm ci && npm run prisma:generate && npm run build`
- **Start Command:** `npm start`
- **Environment Variables:**
  - `PORT`: `4000`
  - `DATABASE_URL`: `file:./data/prod.db` (or Supabase/PostgreSQL connection string)
  - `CLIENT_ORIGIN`: `*`

### Frontend (Vite + React):
- **Root Directory:** `client`
- **Build Command:** `npm ci && npm run build`
- **Publish Directory:** `dist`
- **Vite Proxy / Env:** Set `VITE_API_URL` to your backend URL.

---

## 5. Persistent Supabase / PostgreSQL Configuration (Optional)

If you prefer PostgreSQL over SQLite for enterprise cloud hosting:
1. In `server/prisma/schema.prisma`, update the datasource:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Set your Supabase connection string in `.env`:
   ```bash
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres"
   ```
3. Run schema sync:
   ```bash
   npx prisma db push
   ```
