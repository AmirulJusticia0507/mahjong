const { isWinningHand, validateGang, validatePong, validateChi, isSuited } = require('./MahjongEngine');

function chooseDiscard(hand, rng = Math.random) {
  const counts = {};
  for (const tile of hand) counts[tile] = (counts[tile] || 0) + 1;
  const score = (tile) => {
    if (!isSuited(tile)) return counts[tile] === 1 ? 0 : counts[tile] * 3;
    const rank = Number(tile.slice(1));
    const suit = tile[0];
    return counts[tile] * 3
      + (counts[`${suit}${rank - 1}`] || 0)
      + (counts[`${suit}${rank + 1}`] || 0)
      + .5 * ((counts[`${suit}${rank - 2}`] || 0) + (counts[`${suit}${rank + 2}`] || 0));
  };
  const minimum = Math.min(...hand.map(score));
  const candidates = hand.filter((tile) => score(tile) === minimum);
  return candidates[Math.floor(rng() * candidates.length)];
}

function chooseClaim(player, tile, canChi) {
  if (isWinningHand(player.hand.concat([tile]), player.melds.length)) return 'hu';
  if (validateGang(player.hand, tile)) return 'gang';
  if (validatePong(player.hand, tile)) return 'pong';
  if (canChi && validateChi(player.hand, tile)) return 'chi';
  return null;
}

module.exports = { chooseDiscard, chooseClaim };
