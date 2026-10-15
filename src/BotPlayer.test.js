const test = require('node:test');
const assert = require('node:assert/strict');
const { chooseDiscard, chooseClaim } = require('./BotPlayer');

test('bot prefers a singleton honour for discard', () => {
  assert.equal(chooseDiscard(['B1', 'B1', 'WE', 'K2'], () => 0), 'WE');
});

test('bot claim priority chooses gang before pong', () => {
  const player = { hand: ['B1', 'B1', 'B1'], melds: [] };
  assert.equal(chooseClaim(player, 'B1', false), 'gang');
});

test('bot skips unavailable claim', () => {
  const player = { hand: ['B2', 'K3'], melds: [] };
  assert.equal(chooseClaim(player, 'B9', false), null);
});
