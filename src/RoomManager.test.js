const test = require('node:test');
const assert = require('node:assert/strict');
const { Room } = require('./RoomManager');

function roomWithPlayers(count) {
  const room = new Room('TEST01', count);
  for (let i = 0; i < count; i++) room.addPlayer(`p${i}`, `Player ${i}`);
  return room;
}

test('room supports 2-4 players and fills remaining seats with bots', (t) => {
  const room = roomWithPlayers(3);
  t.after(() => room.clearTimers());
  room.players.pop();
  assert.equal(room.startGame(true).ok, true);
  assert.equal(room.players.length, 3);
  assert.equal(room.players.filter((p) => p.isBot).length, 1);
});

test('waiting host transfers when leaving', () => {
  const room = roomWithPlayers(2);
  assert.equal(room.hostId, 'p0');
  const result = room.leave('p0');
  assert.equal(result.left.name, 'Player 0');
  assert.equal(room.hostId, 'p1');
});

test('chi position follows room player count', (t) => {
  const room = roomWithPlayers(3);
  t.after(() => room.clearTimers());
  room.status = 'playing';
  room.phase = 'claim';
  room.players[0].hand = ['B2', 'B3'];
  room.claimState = { tile: 'B1', by: 2, claims: [], responses: new Set() };
  assert.equal(room.submitClaim('p0', 'chi').ok, true);
});

test('all claim passes resolve immediately and advance the turn', (t) => {
  const room = roomWithPlayers(2);
  t.after(() => room.clearTimers());
  room.status = 'playing';
  room.phase = 'claim';
  room.wall = ['B9'];
  room.claimState = { tile: 'B1', by: 0, claims: [], responses: new Set() };
  assert.equal(room.passClaim('p1').ok, true);
  assert.equal(room.currentTurn, 1);
  assert.equal(room.phase, 'discard');
  assert.deepEqual(room.players[1].hand, ['B9']);
});

test('concealed gang draws a replacement tile', (t) => {
  const room = roomWithPlayers(2);
  t.after(() => room.clearTimers());
  room.status = 'playing';
  room.phase = 'discard';
  room.currentTurn = 0;
  room.wall = ['K9'];
  room.players[0].hand = ['B1', 'B1', 'B1', 'B1'];
  assert.equal(room.declareGang('p0', 'B1').ok, true);
  assert.deepEqual(room.players[0].melds[0], { type: 'gang', tiles: ['B1', 'B1', 'B1', 'B1'] });
  assert.deepEqual(room.players[0].hand, ['K9']);
});

test('playing player can reconnect using their private token', (t) => {
  const room = roomWithPlayers(2);
  t.after(() => room.clearTimers());
  room.status = 'playing';
  const token = room.players[0].reconnectToken;
  room.disconnect('p0');
  assert.equal(room.players[0].disconnected, true);
  const player = room.reconnect(token, 'p0-new');
  assert.equal(player.id, 'p0-new');
  assert.equal(player.isBot, false);
  assert.equal(player.disconnected, false);
});

test('host can kick a waiting player', () => {
  const room = roomWithPlayers(2);
  assert.equal(room.kick('p0', 'p1').ok, true);
  assert.equal(room.players.length, 1);
  assert.equal(room.kick('p0', 'p0').ok, false);
});

test('inactive room cleanup removes old rooms', () => {
  const { RoomManager } = require('./RoomManager');
  const manager = new RoomManager();
  const room = manager.createRoom(2);
  room.updatedAt = 1;
  manager.removeInactiveRooms(1000);
  assert.equal(manager.rooms.size, 0);
});

test('self-draw Hu awards basic score and host starts next round', (t) => {
  const room = roomWithPlayers(2);
  t.after(() => room.clearTimers());
  room.status = 'playing';
  room.phase = 'discard';
  room.currentTurn = 0;
  room.players[0].hand = ['B1','B2','B3','B4','B5','B6','B7','B8','B9','B1','B1','B1','K1','K1'];
  assert.equal(room.declareHu('p0').ok, true);
  assert.deepEqual(room.players.map((p) => p.score), [1, -1]);
  assert.equal(room.nextRound('p0').ok, true);
  assert.equal(room.round, 2);
  assert.equal(room.status, 'playing');
});

test('private state exposes only valid viewer actions', (t) => {
  const room = roomWithPlayers(3);
  t.after(() => room.clearTimers());
  room.status = 'playing';
  room.phase = 'claim';
  room.claimState = { tile: 'B1', by: 2, claims: [], responses: new Set() };
  room.players[0].hand = ['B2', 'B3'];
  const state = room.toState('p0');
  assert.equal(state.capabilities.chi, true);
  assert.equal(state.capabilities.pass, true);
  assert.equal(state.players[1].hand, undefined);
});

test('room listing exposes counts without private player data', () => {
  const { RoomManager } = require('./RoomManager');
  const manager = new RoomManager();
  const room = manager.createRoom(4);
  room.addPlayer('p0', 'Host');
  assert.deepEqual(manager.listRooms(), [{ code: room.code, status: 'waiting', players: 1, maxPlayers: 4 }]);
});
