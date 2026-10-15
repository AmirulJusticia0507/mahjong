const test = require('node:test');
const assert = require('node:assert/strict');
const { io: createClient } = require('socket.io-client');
const { start, stop, manager } = require('./server');

function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = createClient(url, { transports: ['websocket'], forceNew: true, reconnection: false });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

function emitAck(socket, event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}

function once(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve));
}

function waitForState(socket, predicate) {
  return new Promise((resolve) => {
    const handler = (state) => {
      if (!predicate(state)) return;
      socket.off('updateGameState', handler);
      resolve(state);
    };
    socket.on('updateGameState', handler);
  });
}

test('socket create, join, private state, and leave flow', { timeout: 10000 }, async (t) => {
  const address = await start(0);
  const url = `http://127.0.0.1:${address.port}`;
  const host = await connect(url);
  const guest = await connect(url);
  let resumedGuest = null;

  t.after(async () => {
    host.disconnect();
    guest.disconnect();
    host.io._close();
    guest.io._close();
    if (resumedGuest) { resumedGuest.disconnect(); resumedGuest.io._close(); }
    await new Promise((resolve) => setTimeout(resolve, 50));
    await stop();
    manager.rooms.clear();
  });

  const created = await emitAck(host, 'createRoom', { name: '<Host>', maxPlayers: 2 });
  assert.equal(created.ok, true);
  assert.match(created.code, /^[A-Z0-9]{6}$/);

  const playingHostPromise = waitForState(host, (state) => state.status === 'playing');
  const playingGuestPromise = waitForState(guest, (state) => state.status === 'playing');
  const joined = await emitAck(guest, 'joinRoom', { name: 'Guest', code: created.code });
  assert.equal(joined.ok, true);
  const [hostState, guestState] = await Promise.all([playingHostPromise, playingGuestPromise]);
  assert.equal(guestState.players.length, 2);
  assert.equal(guestState.players.find((p) => p.id === host.id).hand, undefined);

  const claimStatePromise = waitForState(guest, (state) => state.phase === 'claim');
  host.emit('discardTile', { code: created.code, tile: hostState.yourHand[0] });
  await claimStatePromise;
  const guestTurnPromise = waitForState(guest, (state) => state.phase === 'discard' && state.currentTurn === 1);
  guest.emit('passClaim', { code: created.code });
  await guestTurnPromise;

  const token = guestState.reconnectToken;
  guest.disconnect();
  guest.io._close();
  await new Promise((resolve) => setTimeout(resolve, 50));
  resumedGuest = await connect(url);
  const resumedStatePromise = waitForState(resumedGuest, (state) => state.code === created.code);
  const resumed = await emitAck(resumedGuest, 'resumeSession', { code: created.code, token });
  assert.equal(resumed.ok, true);
  const resumedState = await resumedStatePromise;
  assert.equal(resumedState.yourHand.length > 0, true);

  const leftPromise = once(resumedGuest, 'roomLeft');
  resumedGuest.emit('leaveRoom');
  await leftPromise;
  const room = manager.getRoom(created.code);
  assert.equal(room.players.length, 2);
  assert.equal(room.players.some((p) => p.isBot), true);
});
