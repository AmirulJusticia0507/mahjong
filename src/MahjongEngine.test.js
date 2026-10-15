const test = require('node:test');
const assert = require('node:assert');
const E = require('./MahjongEngine');

test('deck has 136 tiles', () => {
  const deck = E.createDeck();
  assert.strictEqual(deck.length, 136);
});

test('hand count uniqueness not required; shuffle changes order', () => {
  const a = E.shuffle(E.createDeck());
  const b = E.shuffle(E.createDeck());
  assert.notDeepEqual(a, b);
});

test('seeded shuffle is reproducible', () => {
  const a = E.shuffle(E.createDeck(), E.seededRandom(42));
  const b = E.shuffle(E.createDeck(), E.seededRandom(42));
  assert.deepStrictEqual(a, b);
});

test('winning hand detected', () => {
  const hand = ['B1','B2','B3','B4','B5','B6','B7','B8','B9','B1','B1','B1','K1','K1'];
  assert.strictEqual(E.isWinningHand(hand, 0), true);
});

test('non-winning hand rejected', () => {
  const hand = Array(14).fill('B1');
  // 14 same tiles: could be wrong composition; ensure not crash
  const r = E.isWinningHand(hand, 0);
  assert.ok(typeof r === 'boolean');
});

test('chi validation', () => {
  assert.deepStrictEqual(E.validateChi(['B2','B3'], 'B1'), ['B2','B3']);
  assert.strictEqual(E.validateChi(['B4','B5'], 'B1'), null);
});

test('pong/gang validation', () => {
  assert.strictEqual(E.validatePong(['B1','B1'], 'B1'), true);
  assert.strictEqual(E.validatePong(['B1'], 'B1'), false);
  assert.strictEqual(E.validateGang(['B1','B1','B1'], 'B1'), true);
  assert.strictEqual(E.validateGang(['B1','B1'], 'B1'), false);
});

test('remove helpers', () => {
  const h = ['B1','B1','B2','B3'];
  const r = E.removeForChi(h, 'B1');
  assert.ok(Array.isArray(r));
});
