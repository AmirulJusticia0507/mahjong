// Pure-ish Mahjong helpers (server-authoritative logic helpers).
// Tiles are strings such as "B1" (bamboo), "K5" (coins), "M3" (characters),
// "WE/WS/WW/WN" (winds), "DR/DG/DW" (dragons). Four copies each, total 136.

const SUITS = ['B', 'K', 'M'];
const SUIT_ORDER = { B: 0, K: 1, M: 2, W: 3, D: 4 };
const WINDS = ['WE', 'WS', 'WW', 'WN'];
const DRAGONS = ['DR', 'DG', 'DW'];

function tileSuit(t) {
  return t[0];
}

function tileRank(t) {
  const n = parseInt(t.slice(1), 10);
  return Number.isNaN(n) ? null : n;
}

function isSuited(t) {
  return SUITS.includes(t[0]);
}

function createDeck() {
  const deck = [];
  for (const s of SUITS) {
    for (let r = 1; r <= 9; r++) {
      for (let i = 0; i < 4; i++) deck.push(`${s}${r}`);
    }
  }
  for (const w of WINDS) for (let i = 0; i < 4; i++) deck.push(w);
  for (const d of DRAGONS) for (let i = 0; i < 4; i++) deck.push(d);
  return deck;
}

function shuffle(deck, rng = Math.random) {
  const a = deck.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function seededRandom(seed) {
  let state = Number(seed) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function sortHand(hand) {
  return hand.slice().sort((a, b) => {
    const sa = SUIT_ORDER[tileSuit(a)];
    const sb = SUIT_ORDER[tileSuit(b)];
    if (sa !== sb) return sa - sb;
    const ra = tileRank(a);
    const rb = tileRank(b);
    if (ra === null || rb === null) return a.localeCompare(b);
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
}

function countTiles(tiles) {
  const m = new Map();
  for (const t of tiles) m.set(t, (m.get(t) || 0) + 1);
  return m;
}

function removeTiles(tiles, toRemove) {
  const arr = tiles.slice();
  for (const t of toRemove) {
    const i = arr.indexOf(t);
    if (i >= 0) arr.splice(i, 1);
  }
  return arr;
}

function canFormMelds(tiles) {
  // tiles: array of strings. Need partition into triples (sets/sequences).
  // Returns true if exact partition possible.
  if (tiles.length === 0) return true;
  const sorted = sortHand(tiles);
  // Try set (pongs) of first tile
  const first = sorted[0];
  // Option 1: set of 3 identical
  const idxs = [];
  for (let i = 0; i < sorted.length && idxs.length < 3; i++) {
    if (sorted[i] === first) idxs.push(i);
  }
  if (idxs.length >= 3) {
    const remaining = sorted.filter((_, i) => !idxs.slice(0, 3).includes(i));
    if (canFormMelds(remaining)) return true;
  }
  // Option 2: sequence (only suited)
  if (isSuited(first)) {
    const r = tileRank(first);
    const s = tileSuit(first);
    const need1 = `${s}${r + 1}`;
    const need2 = `${s}${r + 2}`;
    if (r <= 7) {
      const i1 = sorted.indexOf(need1, sorted.indexOf(first) + 1);
      // find indices distinct
      const findIndexAfter = (val, start) => sorted.indexOf(val, start);
      const iFirst = sorted.indexOf(first);
      const iSecond = findIndexAfter(need1, iFirst + 1);
      const iThird = findIndexAfter(need2, (iSecond >= 0 ? iSecond : iFirst) + 1);
      if (iSecond >= 0 && iThird >= 0 && iFirst !== iSecond && iFirst !== iThird && iSecond !== iThird) {
        const removeSet = new Set([iFirst, iSecond, iThird]);
        const remaining = sorted.filter((_, i) => !removeSet.has(i));
        if (canFormMelds(remaining)) return true;
      }
    }
  }
  return false;
}

function isWinningHand(concealedTiles, fixedMeldCount = 0) {
  const neededMelds = 4 - fixedMeldCount;
  const tiles = sortHand(concealedTiles);
  // pair search
  const seen = new Set();
  for (const t of tiles) {
    if (seen.has(t)) continue;
    seen.add(t);
    const cnt = tiles.filter((x) => x === t).length;
    if (cnt < 2) continue;
    // remove pair
    let removed = 0;
    const remaining = [];
    for (const x of tiles) {
      if (x === t && removed < 2) { removed++; continue; }
      remaining.push(x);
    }
    if (remaining.length !== neededMelds * 3) continue;
    if (canFormMelds(remaining)) {
      // canFormMelds already partitions fully; needed count validated by length
      return true;
    }
  }
  // handle neededMelds 0 (only pair)
  if (neededMelds === 0) {
    return tiles.length === 2 && tiles[0] === tiles[1];
  }
  return false;
}

// Override canFormMelds to accept needed? We'll keep signature canFormMelds(tiles) only; needed inferred by length.
// Patch: rename not needed.

function validateChi(hand, tile) {
  // returns array of 2 tile codes from hand needed, or null if impossible
  if (!isSuited(tile)) return null;
  const s = tileSuit(tile);
  const r = tileRank(tile);
  // possible sequences containing tile
  const combos = [
    [r - 2, r - 1],
    [r - 1, r + 1],
    [r + 1, r + 2],
  ];
  for (const [a, b] of combos) {
    if (a < 1 || b > 9) continue;
    const t1 = `${s}${a}`;
    const t2 = `${s}${b}`;
    if (hand.includes(t1) && hand.includes(t2)) {
      // ensure distinct indices if same code duplicates: hand.includes enough? if duplicates need counts
      const c1 = hand.filter((x) => x === t1).length;
      const c2 = hand.filter((x) => x === t2).length;
      const need1 = t1 === tile ? 1 : 0; // not relevant
      if (c1 > 0 && c2 > 0) {
        // if t1==t2 handle counts
        if (t1 === t2) {
          if (hand.filter((x) => x === t1).length >= 2) return [t1, t2];
        } else {
          return [t1, t2];
        }
      }
    }
  }
  return null;
}

function validatePong(hand, tile) {
  return hand.filter((t) => t === tile).length >= 2;
}

function validateGang(hand, tile) {
  return hand.filter((t) => t === tile).length >= 3;
}

function removeForChi(hand, tile) {
  const pair = validateChi(hand, tile);
  if (!pair) return null;
  return removeTiles(hand, pair);
}

function removeForPong(hand, tile) {
  if (!validatePong(hand, tile)) return null;
  // remove 2 copies
  const arr = hand.slice();
  let removed = 0;
  for (let i = arr.length - 1; i >= 0 && removed < 2; i--) {
    if (arr[i] === tile) { arr.splice(i, 1); removed++; }
  }
  return arr;
}

function removeForGang(hand, tile) {
  if (!validateGang(hand, tile)) return null;
  const arr = hand.slice();
  let removed = 0;
  for (let i = arr.length - 1; i >= 0 && removed < 3; i--) {
    if (arr[i] === tile) { arr.splice(i, 1); removed++; }
  }
  return arr;
}

module.exports = {
  createDeck,
  shuffle,
  seededRandom,
  sortHand,
  countTiles,
  removeTiles,
  isWinningHand,
  validateChi,
  validatePong,
  validateGang,
  removeForChi,
  removeForPong,
  removeForGang,
  isSuited,
  tileSuit,
  tileRank,
  SUITS,
  WINDS,
  DRAGONS,
};
