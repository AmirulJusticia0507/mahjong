const {
  createDeck,
  shuffle,
  sortHand,
  removeTiles,
  isWinningHand,
  validateChi,
  validatePong,
  validateGang,
  removeForChi,
  removeForPong,
  removeForGang,
  isSuited,
} = require('./MahjongEngine');

const CLAIM_TIMEOUT_MS = 5000;
const BOT_DELAY_MS = 1200;

const CLAIM_PRIORITY = { chi: 1, pong: 2, gang: 3, hu: 4 };

function chooseBotDiscard(hand) {
  const counts = {};
  for (const t of hand) counts[t] = (counts[t] || 0) + 1;
  const singles = hand.filter((t) => counts[t] === 1);
  const pool = singles.length ? singles : hand;
  const honours = pool.filter((t) => !isSuited(t));
  const chooseFrom = honours.length ? honours : pool;
  return chooseFrom[Math.floor(Math.random() * chooseFrom.length)];
}

class Room {
  constructor(code, maxPlayers = 4) {
    this.code = code;
    this.maxPlayers = [2, 3, 4].includes(maxPlayers) ? maxPlayers : 4;
    this.players = []; // { id, name, hand, melds, isBot }
    this.status = 'waiting'; // waiting | playing | finished
    this.hostId = null;

    this.wall = [];
    this.discards = [];
    this.currentTurn = 0;
    this.phase = 'waiting'; // draw | discard | claim | finished
    this.lastDiscard = null;
    this.claimState = null;
    this.claimTimer = null;
    this.winner = null;
    this.result = null;
    this.botTimers = [];
  }

  addPlayer(socketId, name) {
    if (this.status !== 'waiting') return { ok: false, error: 'Game already started' };
    if (this.players.length >= this.maxPlayers) return { ok: false, error: 'Room full' };
    if (this.players.some((p) => p.id === socketId)) return { ok: false, error: 'Already in room' };
    const player = { id: socketId, name: name || `Player${this.players.length + 1}`, hand: [], melds: [], isBot: false };
    this.players.push(player);
    if (!this.hostId) this.hostId = socketId;
    return { ok: true, player };
  }

  addBot(name) {
    if (this.players.length >= this.maxPlayers) return null;
    const idx = this.players.length;
    const player = { id: `bot-${idx}-${Date.now()}`, name: name || `Bot${idx + 1}`, hand: [], melds: [], isBot: true };
    this.players.push(player);
    return player;
  }

  removePlayer(socketId) {
    const idx = this.players.findIndex((p) => p.id === socketId);
    if (idx < 0) return false;
    if (this.status === 'playing') {
      this.players[idx].isBot = true;
      this.players[idx].name += ' (bot)';
      this.players[idx].id = `bot-${idx}-${Date.now()}`;
      if (this.hostId === socketId) {
        const humanIdx = this.players.findIndex((p) => !p.isBot);
        this.hostId = humanIdx >= 0 ? this.players[humanIdx].id : this.players[0].id;
      }
      if (this.currentTurn === idx) {
        this.clearBotTimers();
        this.scheduleBotsIfNeeded();
      }
      return true;
    }
    this.players.splice(idx, 1);
    if (this.hostId === socketId) this.hostId = this.players[0] ? this.players[0].id : null;
    return true;
  }

  // Used when a player intentionally leaves (server will also call socket.leave)
  leave(socketId) {
    const idx = this.players.findIndex((p) => p.id === socketId);
    if (idx < 0) return { left: null, roomEmpty: this.players.length === 0 };

    const leaving = this.players[idx];

    if (this.status === 'playing') {
      // keep seat as bot so game can continue
      this.players[idx].isBot = true;
      this.players[idx].name += ' (bot)';
      this.players[idx].id = `bot-${idx}-${Date.now()}`;
      if (this.hostId === socketId) {
        const humanIdx = this.players.findIndex((p) => !p.isBot);
        this.hostId = humanIdx >= 0 ? this.players[humanIdx].id : this.players[0].id;
      }
      if (this.currentTurn === idx) {
        this.clearBotTimers();
        this.scheduleBotsIfNeeded();
      }
      return { left: leaving, roomEmpty: false };
    }

    this.players.splice(idx, 1);
    if (this.hostId === socketId) this.hostId = this.players[0] ? this.players[0].id : null;
    return { left: leaving, roomEmpty: this.players.length === 0 };
  }

  startGame(fillBots = true) {
    if (this.status !== 'waiting') return { ok: false, error: 'Already started' };
    if (this.players.length < 1) return { ok: false, error: 'Need at least 1 player' };
    if (fillBots) while (this.players.length < this.maxPlayers) this.addBot();
    if (this.players.length !== this.maxPlayers) {
      return { ok: false, error: `Need ${this.maxPlayers} players` };
    }

    const n = this.maxPlayers;
    const deck = shuffle(createDeck());
    const hands = Array.from({ length: n }, () => []);
    const HAND = 13;
    for (let i = 0; i < HAND; i++) {
      for (let p = 0; p < n; p++) hands[p].push(deck.pop());
    }
    hands[0].push(deck.pop());
    for (let p = 0; p < n; p++) {
      this.players[p].hand = sortHand(hands[p]);
      this.players[p].melds = [];
    }
    this.wall = deck;
    this.discards = [];
    this.currentTurn = 0;
    this.phase = 'discard';
    this.lastDiscard = null;
    this.claimState = null;
    this.winner = null;
    this.result = null;
    this.status = 'playing';
    this.clearBotTimers();
    this.scheduleBotsIfNeeded();
    return { ok: true };
  }

  clearBotTimers() {
    for (const t of this.botTimers) clearTimeout(t);
    this.botTimers = [];
  }

  findPlayerIndex(id) {
    return this.players.findIndex((p) => p.id === id);
  }

  drawForCurrent() {
    if (this.wall.length === 0) {
      this.endDrawGame();
      return null;
    }
    const t = this.wall.pop();
    const p = this.players[this.currentTurn];
    p.hand.push(t);
    p.hand = sortHand(p.hand);
    return t;
  }

  endDrawGame() {
    this.status = 'finished';
    this.phase = 'finished';
    this.result = 'draw';
    this.winner = null;
    this.clearBotTimers();
  }

  discardTile(playerId, tile) {
    const pIndex = this.findPlayerIndex(playerId);
    if (pIndex < 0) throw new Error('Player not in room');
    if (this.status !== 'playing') throw new Error('Game not running');
    if (this.phase !== 'discard') throw new Error('Not discard phase');
    if (pIndex !== this.currentTurn) throw new Error('Not your turn');

    const player = this.players[pIndex];
    const idx = player.hand.indexOf(tile);
    if (idx < 0) throw new Error('Tile not in hand');

    this.clearBotTimers();
    player.hand.splice(idx, 1);
    player.hand = sortHand(player.hand);

    this.lastDiscard = { tile, by: pIndex };
    this.discards.push({ tile, by: pIndex });
    this.phase = 'claim';
    this.claimState = { tile, by: pIndex, claims: [] };
    this.startClaimWindow();
    this.scheduleBotClaims();
  }

  startClaimWindow() {
    if (this.claimTimer) clearTimeout(this.claimTimer);
    this.claimTimer = setTimeout(() => this.resolveClaims(), CLAIM_TIMEOUT_MS);
  }

  submitClaim(playerId, type) {
    if (this.status !== 'playing' || this.phase !== 'claim' || !this.claimState) {
      return { ok: false, error: 'No claim window' };
    }
    const pIndex = this.findPlayerIndex(playerId);
    if (pIndex < 0) return { ok: false, error: 'Not in room' };
    if (pIndex === this.claimState.by) return { ok: false, error: 'Cannot claim own discard' };
    const player = this.players[pIndex];
    const tile = this.claimState.tile;

    let valid = false;
    if (type === 'hu') {
      valid = isWinningHand(player.hand.concat([tile]), player.melds.length);
    } else if (type === 'gang') {
      valid = validateGang(player.hand, tile);
    } else if (type === 'pong') {
      valid = validatePong(player.hand, tile);
    } else if (type === 'chi') {
      valid = !!validateChi(player.hand, tile) && pIndex === (this.claimState.by + 1) % 4;
    } else {
      return { ok: false, error: 'Unknown claim type' };
    }
    if (!valid) return { ok: false, error: 'Invalid claim' };

    this.claimState.claims = this.claimState.claims.filter((c) => c.pIndex !== pIndex);
    this.claimState.claims.push({ pIndex, type, priority: CLAIM_PRIORITY[type] });

    if (type === 'hu') {
      if (this.claimTimer) clearTimeout(this.claimTimer);
      this.resolveClaims();
    }
    return { ok: true };
  }

  resolveClaims() {
    if (this.phase !== 'claim' || !this.claimState) return;
    if (this.claimTimer) { clearTimeout(this.claimTimer); this.claimTimer = null; }
    this.clearBotTimers();

    const { tile, by, claims } = this.claimState;

    if (!claims || claims.length === 0) {
      this._advanceAfterNoClaim(by);
      return;
    }

    // choose best claim
    let best = claims[0];
    for (const c of claims) {
      if (c.priority > best.priority) best = c;
      else if (c.priority === best.priority) {
        const distBest = (best.pIndex - by + this.players.length) % this.players.length;
        const distC = (c.pIndex - by + this.players.length) % this.players.length;
        if (distC < distBest) best = c;
      }
    }

    const claimer = this.players[best.pIndex];

    if (best.type === 'hu') {
      claimer.hand = sortHand(claimer.hand.concat([tile]));
      this.winner = best.pIndex;
      this.result = 'win';
      this.status = 'finished';
      this.phase = 'finished';
      this.lastDiscard = null;
      this.claimState = null;
      return;
    }

    if (best.type === 'chi') {
      const pair = validateChi(claimer.hand, tile);
      if (!pair) { this._advanceAfterNoClaim(by); return; }
      claimer.hand = sortHand(removeTiles(claimer.hand, pair));
      claimer.melds.push({ type: 'chi', tiles: sortHand([tile].concat(pair)) });
    } else if (best.type === 'pong') {
      claimer.hand = sortHand(removeForPong(claimer.hand, tile));
      claimer.melds.push({ type: 'pong', tiles: [tile, tile, tile] });
    } else if (best.type === 'gang') {
      claimer.hand = sortHand(removeForGang(claimer.hand, tile));
      claimer.melds.push({ type: 'gang', tiles: [tile, tile, tile, tile] });
    }

    this.currentTurn = best.pIndex;
    this.phase = 'discard';
    this.lastDiscard = null;
    this.claimState = null;
    this.scheduleBotsIfNeeded();
  }

  _advanceAfterNoClaim(discarderIndex) {
    this.currentTurn = (discarderIndex + 1) % this.players.length;
    this.drawForCurrent();
    if (this.status === 'playing') {
      this.phase = 'discard';
    }
    this.lastDiscard = null;
    this.claimState = null;
    this.scheduleBotsIfNeeded();
  }

  scheduleBotsIfNeeded() {
    if (this.status !== 'playing') return;
    if (this.phase === 'discard') {
      const p = this.players[this.currentTurn];
      if (p && p.isBot) {
        const t = setTimeout(() => {
          if (this.status !== 'playing' || this.phase !== 'discard') return;
          const tile = chooseBotDiscard(p.hand);
          try { this.discardTile(p.id, tile); } catch (e) { /* ignore */ }
        }, BOT_DELAY_MS);
        this.botTimers.push(t);
      }
    } else if (this.phase === 'claim') {
      this.scheduleBotClaims();
    }
  }

  scheduleBotClaims() {
    if (this.status !== 'playing' || this.phase !== 'claim' || !this.claimState) return;
    const by = this.claimState.by;
    const tile = this.claimState.tile;
    for (let i = 0; i < this.players.length; i++) {
      if (i === by) continue;
      const p = this.players[i];
      if (!p.isBot) continue;
      const t = setTimeout(() => {
        if (this.status !== 'playing' || this.phase !== 'claim' || !this.claimState) return;
        let type = null;
        if (isWinningHand(p.hand.concat([tile]), p.melds.length)) type = 'hu';
        else if (validateGang(p.hand, tile)) type = 'gang';
        else if (validatePong(p.hand, tile)) type = 'pong';
        else if (i === (by + 1) % this.players.length && validateChi(p.hand, tile)) type = 'chi';
        if (type) {
          try { this.submitClaim(p.id, type); } catch (e) { /* ignore */ }
        }
      }, BOT_DELAY_MS + Math.floor(Math.random() * 400));
      this.botTimers.push(t);
    }
  }

  toState(viewerId) {
    const viewer = this.players.find((p) => p.id === viewerId);
    return {
      code: this.code,
      status: this.status,
      hostId: this.hostId,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        handCount: p.hand.length,
        hand: p.id === viewerId ? p.hand : undefined,
        melds: p.melds,
      })),
      wallCount: this.wall.length,
      lastDiscard: this.lastDiscard,
      discardsTail: this.discards.slice(-5),
      currentTurn: this.currentTurn,
      phase: this.phase,
      winner: this.winner,
      result: this.result,
      yourHand: viewer ? viewer.hand : [],
    };
  }
}

class RoomManager {
  constructor() { this.rooms = new Map(); }
  createRoom(maxPlayers = 4) {
    let code;
    do { code = Math.random().toString(36).slice(2, 8).toUpperCase(); } while (this.rooms.has(code));
    const room = new Room(code, maxPlayers);
    this.rooms.set(code, room);
    return room;
  }
  getRoom(code) { return this.rooms.get((code || '').toUpperCase()); }
  removeEmptyRooms() {
    for (const [code, room] of this.rooms) {
      if (room.players.length === 0) this.rooms.delete(code);
    }
  }
}

module.exports = { RoomManager, Room };
