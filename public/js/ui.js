(function (global) {
  const byId = (id) => document.getElementById(id);
  const core = () => global.MahjongCore;
  let lastResultKey = null;
  let deadlineTimer = null;

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
      <div class="text-sm font-semibold mb-1">${escapeHtml(player.name)}${player.isBot ? ' 🤖' : ''} · ${player.score || 0} poin</div>
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
  document.addEventListener('click', function (e) {
    const t = e.target && e.target.getAttribute && e.target.getAttribute('data-tile');
    if (!t) return;
    const client = global.Client;
    if (client && typeof client.selectTile === 'function') client.selectTile(t, e.target);
  });

  global.UI = { render, escapeHtml, toast };
})(window);
