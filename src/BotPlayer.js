const { isWinningHand, validateGang, validatePong, validateChi, isSuited } = require('./MahjongEngine');

function chooseDiscard(hand, rng = Math.random) {
  const counts = {};
  for (const tile of hand) counts[tile] = (counts[tile] || 0) + 1;
  const singles = hand.filter((tile) => counts[tile] === 1);
  const pool = singles.length ? singles : hand;
  const honours = pool.filter((tile) => !isSuited(tile));
  const candidates = honours.length ? honours : pool;
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
