import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import apiRouter from './routes/api.js';
import { setupGameSockets } from './sockets/gameSocket.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for local & LAN multiplayer devices
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static uploads directory for user-uploaded photographs
const uploadsPath = path.resolve(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));

// API router
app.use('/api', apiRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// In the single-container Hostless deployment, serve the built SPA from the
// same origin as the API and Socket.IO endpoint.
const clientDistPath = path.resolve(process.cwd(), 'client-dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDistPath, 'index.html')));
}

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

setupGameSockets(io);

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🎮 Custom 6-Player Board Game Server running on port ${PORT}`);
  console.log(`📁 Uploads served from ${uploadsPath}`);
  console.log(`📡 WebSocket ready for real-time multiplayer`);
});

export { app, server, io };
