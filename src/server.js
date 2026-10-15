const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { RoomManager } = require('./RoomManager');
const logger = require('./logger');

const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const ROOM_IDLE_MS = Number(process.env.ROOM_IDLE_MS) || 60 * 60 * 1000;
const MAX_ROOMS = Number(process.env.MAX_ROOMS) || 100;
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: CORS_ORIGIN } });
const manager = new RoomManager();

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/api/rooms', (_req, res) => res.json(manager.listRooms().filter((room) => room.status === 'waiting')));

function cleanName(value) {
  return String(value || 'Player').replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, 24) || 'Player';
}

function validCode(value) { return /^[A-Z0-9]{6}$/.test(String(value || '').toUpperCase()); }
function validTile(value) { return /^(?:[BKM][1-9]|W[ESWN]|D[RGW])$/.test(String(value || '')); }

function allowEvent(socket, key, limit = 30, windowMs = 10000) {
  const now = Date.now();
  socket.data.rateLimits ||= {};
  const entry = socket.data.rateLimits[key] || { start: now, count: 0 };
  if (now - entry.start >= windowMs) { entry.start = now; entry.count = 0; }
  entry.count += 1;
  socket.data.rateLimits[key] = entry;
  if (entry.count <= limit) return true;
  socket.emit('errorMessage', 'Terlalu banyak permintaan. Coba lagi sebentar.');
  return false;
}

function humanSockets(room) {
  const ids = [];
  for (const p of room.players) {
    if (p.isBot) continue;
    const s = io.sockets.sockets.get(p.id);
    if (s) ids.push(p.id);
  }
  return ids;
}

function broadcastState(room) {
  for (const pid of humanSockets(room)) {
    const s = io.sockets.sockets.get(pid);
    if (s) s.emit('updateGameState', room.toState(pid));
  }
}

function broadcastEvent(room, event, payload) {
  for (const pid of humanSockets(room)) {
    const s = io.sockets.sockets.get(pid);
    if (s) s.emit(event, payload);
  }
}

io.on('connection', (socket) => {
  socket.on('createRoom', (data, ack) => {
    if (!allowEvent(socket, 'room', 8)) return;
    if (manager.rooms.size >= MAX_ROOMS) {
      if (typeof ack === 'function') ack({ ok: false, error: 'Room limit reached' });
      return;
    }
    const maxPlayers = [2, 3, 4].includes(parseInt(data && data.maxPlayers, 10))
      ? parseInt(data.maxPlayers, 10)
      : 4;
    const room = manager.createRoom(maxPlayers);
    const name = cleanName(data && data.name);
    const res = room.addPlayer(socket.id, name);
    if (!res.ok) {
      socket.emit('errorMessage', res.error);
      if (typeof ack === 'function') ack({ ok: false, error: res.error });
      return;
    }
    socket.join(room.code);
    socket.emit('roomJoined', { code: room.code, player: res.player, maxPlayers: room.maxPlayers, reconnectToken: res.player.reconnectToken });
    broadcastState(room);
    if (typeof ack === 'function') ack({ ok: true, code: room.code, maxPlayers: room.maxPlayers });
  });

  socket.on('joinRoom', (data, ack) => {
    if (!allowEvent(socket, 'room', 8)) return;
    const code = (data && data.code || '').toUpperCase();
    if (!validCode(code)) {
      if (typeof ack === 'function') ack({ ok: false, error: 'Invalid room code' });
      return;
    }
    const room = manager.getRoom(code);
    if (!room) {
      const msg = 'Room not found';
      socket.emit('errorMessage', msg);
      if (typeof ack === 'function') ack({ ok: false, error: msg });
      return;
    }
    const name = cleanName(data && data.name);
    const res = room.addPlayer(socket.id, name);
    if (!res.ok) {
      socket.emit('errorMessage', res.error);
      if (typeof ack === 'function') ack({ ok: false, error: res.error });
      return;
    }
    socket.join(room.code);
    socket.emit('roomJoined', { code: room.code, player: res.player, maxPlayers: room.maxPlayers, reconnectToken: res.player.reconnectToken });
    broadcastState(room);
    broadcastEvent(room, 'playerJoined', { name: res.player.name });
    if (typeof ack === 'function') ack({ ok: true, code: room.code, maxPlayers: room.maxPlayers });

    // auto-start when all seats are filled by humans
    const humans = room.players.filter((p) => !p.isBot).length;
    if (humans >= room.maxPlayers && room.status === 'waiting') {
      room.startGame(false);
      broadcastEvent(room, 'gameStarted', { code: room.code });
      broadcastState(room);
    }
  });

  socket.on('startGame', (data) => {
    if (!allowEvent(socket, 'game', 20)) return;
    const code = (data && data.code || '').toUpperCase();
    const room = manager.getRoom(code);
    if (!room) return socket.emit('errorMessage', 'Room not found');
    if (room.hostId !== socket.id) return socket.emit('errorMessage', 'Only host can start');
    const res = room.startGame(true);
    if (!res.ok) return socket.emit('errorMessage', res.error);
    broadcastEvent(room, 'gameStarted', { code: room.code });
    broadcastState(room);
  });

  socket.on('discardTile', (data) => {
    if (!allowEvent(socket, 'game', 20)) return;
    const code = (data && data.code || '').toUpperCase();
    const room = manager.getRoom(code);
    if (!room) return socket.emit('errorMessage', 'Room not found');
    if (!validTile(data && data.tile)) return socket.emit('errorMessage', 'Invalid tile');
    try {
      room.discardTile(socket.id, data.tile);
      broadcastState(room);
    } catch (e) {
      socket.emit('errorMessage', e.message || 'Discard failed');
    }
  });

  socket.on('actionClaim', (data) => {
    if (!allowEvent(socket, 'game', 20)) return;
    const code = (data && data.code || '').toUpperCase();
    const room = manager.getRoom(code);
    if (!room) return socket.emit('errorMessage', 'Room not found');
    const res = room.submitClaim(socket.id, data && data.type);
    if (!res.ok) socket.emit('errorMessage', res.error);
    broadcastState(room);
  });

  socket.on('passClaim', (data) => {
    if (!allowEvent(socket, 'game', 20)) return;
    const room = manager.getRoom((data && data.code || '').toUpperCase());
    if (!room) return socket.emit('errorMessage', 'Room not found');
    const res = room.passClaim(socket.id);
    if (!res.ok) socket.emit('errorMessage', res.error);
    broadcastState(room);
  });

  socket.on('declareGang', (data) => {
    if (!allowEvent(socket, 'game', 20)) return;
    const room = manager.getRoom((data && data.code || '').toUpperCase());
    if (!room) return socket.emit('errorMessage', 'Room not found');
    if (!validTile(data && data.tile)) return socket.emit('errorMessage', 'Invalid tile');
    const res = room.declareGang(socket.id, data.tile);
    if (!res.ok) socket.emit('errorMessage', res.error);
    broadcastState(room);
  });

  socket.on('declareHu', (data) => {
    if (!allowEvent(socket, 'game', 20)) return;
    const room = manager.getRoom((data && data.code || '').toUpperCase());
    if (!room) return socket.emit('errorMessage', 'Room not found');
    const res = room.declareHu(socket.id);
    if (!res.ok) socket.emit('errorMessage', res.error);
    broadcastState(room);
  });

  socket.on('nextRound', (data) => {
    const room = manager.getRoom((data && data.code || '').toUpperCase());
    if (!room) return socket.emit('errorMessage', 'Room not found');
    const res = room.nextRound(socket.id);
    if (!res.ok) return socket.emit('errorMessage', res.error);
    broadcastEvent(room, 'gameStarted', { code: room.code, round: room.round });
    broadcastState(room);
  });

  socket.on('chatMessage', (data) => {
    if (!allowEvent(socket, 'chat', 10)) return;
    const code = (data && data.code || '').toUpperCase();
    const room = manager.getRoom(code);
    if (!room) return;
    const msg = String((data && data.message) || '').slice(0, 300);
    for (const pid of humanSockets(room)) {
      const s = io.sockets.sockets.get(pid);
      if (s) s.emit('chatMessage', { from: room.players.find((p) => p.id === socket.id)?.name || 'Anon', message: msg });
    }
  });

  socket.on('leaveRoom', () => {
    let target = null;
    for (const room of manager.rooms.values()) {
      if (room.players.some((p) => p.id === socket.id)) { target = room; break; }
    }
    if (!target) return socket.emit('roomLeft', {});

    const res = target.leave(socket.id);
    socket.leave(target.code);
    socket.emit('roomLeft', {});

    if (res.roomEmpty) {
      manager.rooms.delete(target.code);
      return;
    }

    // If only bots remain, stop & cleanup room
    if (target.players.length > 0 && target.players.every((p) => p.isBot)) {
      target.clearBotTimers();
      manager.rooms.delete(target.code);
      return;
    }

    broadcastEvent(target, 'playerLeft', { name: res.left ? res.left.name : 'Player' });
    broadcastState(target);
  });

  socket.on('resumeSession', (data, ack) => {
    if (!allowEvent(socket, 'room', 8)) return;
    const code = String(data && data.code || '').toUpperCase();
    const token = String(data && data.token || '');
    if (!validCode(code) || !token) return typeof ack === 'function' && ack({ ok: false });
    const room = manager.getRoom(code);
    const player = room && room.reconnect(token, socket.id);
    if (!player) return typeof ack === 'function' && ack({ ok: false });
    socket.join(code);
    socket.emit('roomResumed', { code, reconnectToken: token });
    broadcastState(room);
    if (typeof ack === 'function') ack({ ok: true, code });
  });

  socket.on('kickPlayer', (data) => {
    const room = manager.getRoom((data && data.code || '').toUpperCase());
    if (!room) return socket.emit('errorMessage', 'Room not found');
    const targetId = String(data && data.playerId || '');
    const res = room.kick(socket.id, targetId);
    if (!res.ok) return socket.emit('errorMessage', res.error);
    const targetSocket = io.sockets.sockets.get(targetId);
    if (targetSocket) {
      targetSocket.leave(room.code);
      targetSocket.emit('kicked', { code: room.code });
    }
    broadcastEvent(room, 'playerLeft', { name: res.player.name });
    broadcastState(room);
  });

  socket.on('requestState', (data) => {
    const code = (data && data.code || '').toUpperCase();
    const room = manager.getRoom(code);
    if (room) socket.emit('updateGameState', room.toState(socket.id));
  });

  socket.on('disconnect', () => {
    for (const room of manager.rooms.values()) {
      if (room.players.some((p) => p.id === socket.id)) {
        const res = room.disconnect(socket.id);
        if (res.roomEmpty || room.players.every((p) => p.isBot && !p.disconnected)) {
          room.clearTimers();
          manager.rooms.delete(room.code);
          continue;
        }
        broadcastState(room);
      }
    }
    manager.removeEmptyRooms();
  });
});

const cleanupTimer = setInterval(() => manager.removeInactiveRooms(ROOM_IDLE_MS), Math.min(ROOM_IDLE_MS, 60000));
cleanupTimer.unref();

app.use((error, _req, res, _next) => {
  logger.error('Unhandled HTTP error', { error: error.message });
  res.status(500).json({ error: 'Internal server error' });
});

function shutdown(signal) {
  logger.info('Shutdown requested', { signal });
  clearInterval(cleanupTimer);
  for (const room of manager.rooms.values()) room.clearTimers();
  io.close(() => server.close(() => process.exit(0)));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

function start(port = PORT) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => {
      server.off('error', reject);
      const address = server.address();
      logger.info('Mahjong server listening', { port: address.port });
      resolve(address);
    });
  });
}

function stop() {
  return new Promise((resolve) => {
    for (const room of manager.rooms.values()) room.clearTimers();
    io.disconnectSockets(true);
    server.unref();
    io.close(() => {
      if (server.listening) server.close(resolve);
      else resolve();
    });
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
  });
}

if (require.main === module) {
  process.on('unhandledRejection', (error) => logger.error('Unhandled rejection', { error: String(error) }));
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.stack || error.message });
    shutdown('uncaughtException');
  });
  start().catch((error) => {
    logger.error('Server failed to start', { error: error.message });
    process.exit(1);
  });
}

module.exports = { app, server, io, manager, start, stop };
