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
    socket.emit('createRoom', { name }, (res) => {
      if (res && res.ok) {
        roomCode = res.code;
        document.getElementById('roomCode').value = res.code;
        status.textContent = `Room ${res.code} dibuat. Tunggu pemain / klik Start.`;
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

  document.querySelectorAll('.claimBtn').forEach((b) => {
    b.addEventListener('click', () => {
      if (!roomCode) return;
      const type = b.getAttribute('data-claim');
      socket.emit('actionClaim', { code: roomCode, type });
    });
  });
  document.getElementById('passBtn').addEventListener('click', () => { /* no-op; timeout handles */ });

  document.getElementById('chatSend').addEventListener('click', () => {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg || !roomCode) return;
    socket.emit('chatMessage', { code: roomCode, message: msg });
    input.value = '';
  });

  // Socket events
  socket.on('connect', () => { setMyId(socket.id); });

  socket.on('roomJoined', (data) => {
    roomCode = data.code;
    setMyId(socket.id);
    showGame();
    document.getElementById('roomLabel').textContent = data.code;
    log(`Bergabung ke room ${data.code}`);
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

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
})();
