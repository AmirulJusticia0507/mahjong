(function () {
  const socket = io();
  let roomCode = null;
  let myId = null;
  let state = null;

  const lobby = document.getElementById('lobby');
  const game = document.getElementById('game');
  const status = document.getElementById('lobbyStatus');

  function showGame() {
    lobby.classList.add('hidden');
    game.classList.remove('hidden');
  }

  function log(msg) {
    const el = document.getElementById('gameLog');
    const line = document.createElement('div');
    line.textContent = msg;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  }

  function setMyId(id) { myId = id; window.__myId = id; }
  window.Client = {
    get myId() { return myId; },
    discard: function (tile) {
      if (!roomCode || !state || state.phase !== 'discard') return;
      // only current player may discard
      const myIndex = state.players.findIndex((p) => p.id === myId);
      if (state.currentTurn !== myIndex) return;
      socket.emit('discardTile', { code: roomCode, tile: tile });
    },
  };

  // Lobby buttons
  document.getElementById('createBtn').addEventListener('click', () => {
    const name = document.getElementById('name').value || 'Player';
    const maxPlayers = parseInt(document.getElementById('playerCount').value, 10) || 4;
    socket.emit('createRoom', { name, maxPlayers }, (res) => {
      if (res && res.ok) {
        roomCode = res.code;
        document.getElementById('roomCode').value = res.code;
        status.textContent = `Room ${res.code} dibuat untuk ${res.maxPlayers || maxPlayers} pemain. Tunggu pemain / klik Start.`;
      } else {
        status.textContent = (res && res.error) || 'Gagal membuat room';
      }
    });
  });

  document.getElementById('joinBtn').addEventListener('click', () => {
    const name = document.getElementById('name').value || 'Player';
    const code = document.getElementById('roomCode').value.trim().toUpperCase();
    if (!code) { status.textContent = 'Masukkan kode room'; return; }
    socket.emit('joinRoom', { code, name }, (res) => {
      if (res && res.ok) {
        roomCode = res.code;
        status.textContent = `Bergabung ke ${res.code}`;
      } else {
        status.textContent = (res && res.error) || 'Gagal join';
      }
    });
  });

  document.getElementById('startBtn').addEventListener('click', () => {
    if (!roomCode) return;
    socket.emit('startGame', { code: roomCode });
  });

  document.getElementById('leaveBtn').addEventListener('click', () => {
    if (!roomCode) return;
    socket.emit('leaveRoom');
  });

  document.querySelectorAll('.claimBtn').forEach((b) => {
    b.addEventListener('click', () => {
      if (!roomCode) return;
      const type = b.getAttribute('data-claim');
      socket.emit('actionClaim', { code: roomCode, type });
    });
  });
  document.getElementById('declareGangBtn').addEventListener('click', () => {
    if (!roomCode || !state || state.phase !== 'discard') return;
    const me = state.players.find((p) => p.id === myId);
    if (!me || !me.hand) return;
    const counts = me.hand.reduce((all, tile) => {
      all[tile] = (all[tile] || 0) + 1;
      return all;
    }, {});
    const promoted = (me.melds || []).find((m) => m.type === 'pong' && counts[m.tiles[0]] >= 1);
    const tile = promoted ? promoted.tiles[0] : Object.keys(counts).find((key) => counts[key] >= 4);
    if (!tile) return log('Tidak ada Gang dari tangan yang valid.');
    socket.emit('declareGang', { code: roomCode, tile });
  });
  document.getElementById('declareHuBtn').addEventListener('click', () => {
    if (roomCode && state && state.phase === 'discard' && window.confirm('Klaim Hu dari tangan ini?')) {
      socket.emit('declareHu', { code: roomCode });
    }
  });
  document.getElementById('nextRoundBtn').addEventListener('click', () => {
    if (roomCode) socket.emit('nextRound', { code: roomCode });
  });
  document.getElementById('passBtn').addEventListener('click', () => {
    if (roomCode) socket.emit('passClaim', { code: roomCode });
  });

  document.getElementById('chatSend').addEventListener('click', () => {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg || !roomCode) return;
    socket.emit('chatMessage', { code: roomCode, message: msg });
    input.value = '';
  });

  // Socket events
  socket.on('connect', () => {
    setMyId(socket.id);
    try {
      const saved = JSON.parse(sessionStorage.getItem('mahjongSession') || 'null');
      if (saved && saved.code && saved.token) socket.emit('resumeSession', saved);
    } catch (_) { sessionStorage.removeItem('mahjongSession'); }
  });

  socket.on('roomJoined', (data) => {
    roomCode = data.code;
    setMyId(socket.id);
    showGame();
    document.getElementById('roomLabel').textContent = data.code;
    document.getElementById('leaveBtn').classList.remove('hidden');
    log(`Bergabung ke room ${data.code}`);
    sessionStorage.setItem('mahjongSession', JSON.stringify({ code: data.code, token: data.reconnectToken }));
  });

  socket.on('roomResumed', (data) => {
    roomCode = data.code;
    setMyId(socket.id);
    showGame();
    document.getElementById('roomLabel').textContent = data.code;
    log(`Sesi room ${data.code} dipulihkan`);
  });

  socket.on('roomLeft', () => {
    roomCode = null;
    state = null;
    game.classList.add('hidden');
    lobby.classList.remove('hidden');
    status.textContent = 'Kamu keluar dari room.';
    sessionStorage.removeItem('mahjongSession');
  });

  socket.on('kicked', () => {
    sessionStorage.removeItem('mahjongSession');
    roomCode = null;
    state = null;
    game.classList.add('hidden');
    lobby.classList.remove('hidden');
    status.textContent = 'Kamu dikeluarkan oleh host.';
  });

  socket.on('errorMessage', (msg) => {
    if (!game.classList.contains('hidden')) log(`⚠️ ${msg}`);
    else status.textContent = msg;
  });

  socket.on('gameStarted', (data) => {
    log('Game dimulai');
    // show start button hidden
  });

  socket.on('updateGameState', (s) => {
    state = s;
    if (s.hostId === myId) {
      document.getElementById('startBtn').classList.remove('hidden');
    } else {
      document.getElementById('startBtn').classList.add('hidden');
    }
    if (s.status === 'waiting') document.getElementById('startBtn').classList.remove('hidden');
    document.getElementById('nextRoundBtn').classList.toggle('hidden', !(s.status === 'finished' && s.hostId === myId));
    window.UI.render(s);
  });

  socket.on('chatMessage', (data) => {
    const el = document.getElementById('chatLog');
    const line = document.createElement('div');
    line.innerHTML = `<span class="text-sky-400">${escapeHtml(data.from)}:</span> ${escapeHtml(data.message)}`;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  });

  socket.on('playerJoined', (data) => {
    log(`${data.name} bergabung`);
  });

  socket.on('playerLeft', (data) => {
    log(`${data.name} keluar`);
  });

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
})();
