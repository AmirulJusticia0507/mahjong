(function (global) {
  const byId = (id) => document.getElementById(id);
  const core = () => global.MahjongCore;
  let lastResultKey = null;
  let deadlineTimer = null;

  function areaHTML(player, isMe) {
    if (!player) return '';
    const melds = (player.melds || []).map((m) => `<span class="meld" title="${escapeHtml(m.type)}">${(m.tiles || []).map((tile) => core().tileHTML(tile, 'meld-tile', false)).join('')}</span>`).join('');
    let handHTML = '';
    if (isMe && player.hand) {
      handHTML = player.hand.map((t) => core().tileHTML(t)).join('');
    } else {
      handHTML = `<span class="text-slate-300">${player.handCount || 0} batu</span>`;
    }
    return `
      <div class="text-sm font-semibold mb-1">${escapeHtml(player.name)}${player.isBot ? ' 🤖' : ''}${player.disconnected ? ' · offline' : ''} · ${player.score || 0} poin</div>
      <div class="flex flex-wrap items-center gap-1 mb-1">${melds}</div>
      <div class="flex flex-wrap">${handHTML}</div>
    `;
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function render(state) {
    if (!state) return;
    byId('roomLabel').textContent = state.code;
    byId('phaseLabel').textContent = `${state.phase} · ronde ${state.round || 1}`;
    byId('wallLabel').textContent = state.wallCount;
    byId('lastDiscard').innerHTML = state.lastDiscard ? core().tileHTML(state.lastDiscard.tile, 'discard-tile', false) : '<span class="text-slate-400">-</span>';
    byId('discardRiver').innerHTML = (state.discardsTail || []).map((discard, index, all) => core().tileHTML(discard.tile, index === all.length - 1 ? 'discard-tile latest' : 'discard-tile', false)).join('');

    const players = state.players || [];
    const myId = (global.Client && global.Client.myId) || (global.__myId);
    let myIndex = players.findIndex((p) => p.id === myId);
    if (myIndex < 0) myIndex = 0;

    const idx = (o) => (myIndex + o) % players.length;
    const top = players.length === 2 ? players[idx(1)] : (players.length === 4 ? players[idx(2)] : null);
    const right = players.length >= 3 ? players[idx(1)] : null;
    const bottom = players[idx(0)];
    const left = players.length === 4 ? players[idx(3)] : (players.length === 3 ? players[idx(2)] : null);

    byId('topArea').innerHTML = areaHTML(top, false);
    byId('rightArea').innerHTML = areaHTML(right, false);
    byId('leftArea').innerHTML = areaHTML(left, false);
    byId('bottomArea').innerHTML = areaHTML(bottom, true);

    // winner
    const resultKey = `${state.round}:${state.status}:${state.result}:${state.winner}`;
    if (state.status === 'finished' && lastResultKey !== resultKey) {
      lastResultKey = resultKey;
      const gl = byId('gameLog');
      const line = document.createElement('div');
      line.textContent = state.result === 'win' ? `🏆 Pemain ${state.winner} menang!` : '🤝 Seri (wall habis)';
      gl.appendChild(line);
    }

    const caps = state.capabilities || {};
    document.querySelectorAll('.claimBtn').forEach((button) => {
      const enabled = !!caps[button.getAttribute('data-claim')];
      button.disabled = !enabled;
      button.classList.toggle('opacity-50', !enabled);
    });
    setEnabled('passBtn', caps.pass);
    setEnabled('discardSelectedBtn', caps.discard);
    setEnabled('declareGangBtn', caps.concealedGang);
    setEnabled('declareHuBtn', caps.selfHu);
    startDeadline(state.deadline);
  }

  function setEnabled(id, enabled) {
    const element = byId(id);
    element.disabled = !enabled;
    element.classList.toggle('opacity-50', !enabled);
  }

  function startDeadline(deadline) {
    if (deadlineTimer) clearInterval(deadlineTimer);
    const label = byId('timerLabel');
    if (!deadline) { label.textContent = ''; deadlineTimer = null; return; }
    const update = () => {
      const remaining = Math.max(0, deadline - Date.now());
      label.textContent = `${Math.ceil(remaining / 1000)}s`;
      if (remaining <= 0 && deadlineTimer) clearInterval(deadlineTimer);
    };
    update();
    deadlineTimer = setInterval(update, 250);
  }

  function toast(message, type = 'info') {
    const element = byId('toast');
    element.textContent = String(message);
    element.className = `toast ${type}`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.add('hidden'), 3000);
  }

  // bind tile clicks for discard
  // walk up from e.target to find any ancestor with data-tile,
  // so clicking on glyphs or other inner elements still selects the tile correctly
  document.addEventListener('click', function (e) {
    let tile = e.target;
    while (tile && tile.nodeType === 1) {
      if (tile.hasAttribute('data-tile')) break;
      tile = tile.parentElement;
    }
    if (!tile) return;
    const t = tile.getAttribute('data-tile');
    const client = global.Client;
    if (client && typeof client.selectTile === 'function') client.selectTile(t, tile);
  });

  global.UI = { render, escapeHtml, toast };
})(window);
