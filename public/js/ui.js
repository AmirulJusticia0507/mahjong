(function (global) {
  const byId = (id) => document.getElementById(id);
  const core = () => global.MahjongCore;

  function areaHTML(player, isMe) {
    if (!player) return '';
    const melds = (player.melds || []).map((m) => `<span class="text-xs bg-slate-700 px-2 py-1 rounded mr-1">${(m.tiles || []).join(' ')}</span>`).join('');
    let handHTML = '';
    if (isMe && player.hand) {
      handHTML = player.hand.map((t) => core().tileHTML(t)).join('');
    } else {
      handHTML = `<span class="text-slate-300">${player.handCount || 0} batu</span>`;
    }
    return `
      <div class="text-sm font-semibold mb-1">${escapeHtml(player.name)}${player.isBot ? ' 🤖' : ''}</div>
      <div class="flex flex-wrap items-center gap-1 mb-1">${melds}</div>
      <div class="flex flex-wrap">${handHTML}</div>
    `;
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function render(state) {
    if (!state) return;
    byId('roomLabel').textContent = state.code;
    byId('phaseLabel').textContent = state.phase;
    byId('wallLabel').textContent = state.wallCount;
    byId('lastDiscard').textContent = state.lastDiscard ? `${state.lastDiscard.tile} (p${state.lastDiscard.by})` : '-';

    const players = state.players || [];
    const myId = (global.Client && global.Client.myId) || (global.__myId);
    let myIndex = players.findIndex((p) => p.id === myId);
    if (myIndex < 0) myIndex = 0;

    const idx = (o) => (myIndex + o) % players.length;
    const top = players[idx(2)];
    const right = players[idx(1)];
    const bottom = players[idx(0)];
    const left = players[idx(3)];

    byId('topArea').innerHTML = areaHTML(top, false);
    byId('rightArea').innerHTML = areaHTML(right, false);
    byId('leftArea').innerHTML = areaHTML(left, false);
    byId('bottomArea').innerHTML = areaHTML(bottom, true);

    // winner
    if (state.status === 'finished') {
      const gl = byId('gameLog');
      const line = document.createElement('div');
      line.textContent = state.result === 'win' ? `🏆 Pemain ${state.winner} menang!` : '🤝 Seri (wall habis)';
      gl.appendChild(line);
    }

    // enable claim buttons only in claim phase
    const claimPhase = state.phase === 'claim';
    document.querySelectorAll('.claimBtn').forEach((b) => { b.disabled = !claimPhase; b.classList.toggle('opacity-50', !claimPhase); });
  }

  // bind tile clicks for discard
  document.addEventListener('click', function (e) {
    const t = e.target && e.target.getAttribute && e.target.getAttribute('data-tile');
    if (!t) return;
    const client = global.Client;
    if (client && typeof client.discard === 'function') client.discard(t);
  });

  global.UI = { render, escapeHtml };
})(window);