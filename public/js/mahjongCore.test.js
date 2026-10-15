const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'mahjongCore.js'), 'utf8');
const context = { window: {} };
vm.runInNewContext(source, context);
const core = context.window.MahjongCore;

test('tile codes map to standard Mahjong Unicode glyphs', () => {
  assert.equal(core.tileSymbol('WE'), '🀀');
  assert.equal(core.tileSymbol('DR'), '🀄');
  assert.equal(core.tileSymbol('M1'), '🀇');
  assert.equal(core.tileSymbol('B1'), '🀐');
  assert.equal(core.tileSymbol('K1'), '🀙');
});

test('tile markup contains accessible label and physical tile classes', () => {
  const html = core.tileHTML('B3');
  assert.match(html, /aria-label="Bambu 3"/);
  assert.match(html, /tile-symbol/);
  assert.match(html, /data-tile="B3"/);
});
