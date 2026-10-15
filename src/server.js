const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { RoomManager } = require('./RoomManager');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const manager = new RoomManager();

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/health', (_req, res) => res.json({ ok: true }));

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
    const maxPlayers = [2, 3, 4].includes(parseInt(data && data.maxPlayers, 10))
      ? parseInt(data.maxPlayers, 10)
      : 4;
    const room = manager.createRoom(maxPlayers);
    const name = (data && data.name) || 'Player';
    const res = room.addPlayer(socket.id, name);
    if (!res.ok) {
      socket.emit('errorMessage', res.error);
      if (typeof ack === 'function') ack({ ok: false, error: res.error });
      return;
    }
    socket.join(room.code);
    socket.emit('roomJoined', { code: room.code, player: res.player, maxPlayers: room.maxPlayers });
    broadcastState(room);
    if (typeof ack === 'function') ack({ ok: true, code: room.code, maxPlayers: room.maxPlayers });
  });

  socket.on('joinRoom', (data, ack) => {
    const code = (data && data.code || '').toUpperCase();
    const room = manager.getRoom(code);
    if (!room) {
      const msg = 'Room not found';
      socket.emit('errorMessage', msg);
      if (typeof ack === 'function') ack({ ok: false, error: msg });
      return;
    }
    const name = (data && data.name) || 'Player';
    const res = room.addPlayer(socket.id, name);
    if (!res.ok) {
      socket.emit('errorMessage', res.error);
      if (typeof ack === 'function') ack({ ok: false, error: res.error });
      return;
    }
    socket.join(room.code);
    socket.emit('roomJoined', { code: room.code, player: res.player, maxPlayers: room.maxPlayers });
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
    const code = (data && data.code || '').toUpperCase();
    const room = manager.getRoom(code);
    if (!room) return socket.emit('errorMessage', 'Room not found');
    try {
      room.discardTile(socket.id, data.tile);
      broadcastState(room);
    } catch (e) {
      socket.emit('errorMessage', e.message || 'Discard failed');
    }
  });

  socket.on('actionClaim', (data) => {
    const code = (data && data.code || '').toUpperCase();
    const room = manager.getRoom(code);
    if (!room) return socket.emit('errorMessage', 'Room not found');
    const res = room.submitClaim(socket.id, data && data.type);
    if (!res.ok) socket.emit('errorMessage', res.error);
    broadcastState(room);
  });

  socket.on('passClaim', (data) => {
    const room = manager.getRoom((data && data.code || '').toUpperCase());
    if (!room) return socket.emit('errorMessage', 'Room not found');
    const res = room.passClaim(socket.id);
    if (!res.ok) socket.emit('errorMessage', res.error);
    broadcastState(room);
  });

  socket.on('declareGang', (data) => {
    const room = manager.getRoom((data && data.code || '').toUpperCase());
    if (!room) return socket.emit('errorMessage', 'Room not found');
    const res = room.declareGang(socket.id, data && data.tile);
    if (!res.ok) socket.emit('errorMessage', res.error);
    broadcastState(room);
  });

  socket.on('chatMessage', (data) => {
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

  socket.on('requestState', (data) => {
    const code = (data && data.code || '').toUpperCase();
    const room = manager.getRoom(code);
    if (room) socket.emit('updateGameState', room.toState(socket.id));
  });

  socket.on('disconnect', () => {
    for (const room of manager.rooms.values()) {
      if (room.players.some((p) => p.id === socket.id)) {
        room.removePlayer(socket.id);
        broadcastState(room);
      }
    }
    manager.removeEmptyRooms();
  });
});

server.listen(PORT, () => {
  console.log(`Mahjong server listening on http://localhost:${PORT}`);
});
