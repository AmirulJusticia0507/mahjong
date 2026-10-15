# TODO — Online Multiplayer Mahjong

Status: **MVP backend + frontend sudah diimplementasikan**. Mendukung room 2–4 pemain, vs AI (bot fill), klaim dasar, chat, dan tombol Keluar Room. Bagian yang belum selesai fokus pada robustness, scoring, animasi, dan testing lanjutan.

## 0. Analisa Singkat Dokumentasi

- **Kekuatan:** cakupan fitur lengkap (lobby, room, real-time socket, Chi/Pong/Gang/Hu, chat, bot opsional), alur game & event Socket.io terdefinisi jelas, struktur proyek & tech stack jelas.
- **Kekurangan / pencapaian:**
  - Belum ada `package.json`, `src/`, `public/` → **selesai**.
  - Definisi format `Room`, `Player`, & state game → **sederhana selesai (server-authoritative state per socket)**.
  - Aturan validasi Chi/Pong/Gang/Hu + prioritas + timeout → **validasi & prioritas selesai; timeout klaim 5s selesai**.
  - Bot/AI opsional → **bot dasar selesai (auto fill + auto discard/claim)**.
  - Disconnect/reconnect, sinkronisasi state, keamanan input → **sebagian selesai (state resync + sanitasi dasar; belum rate limit/reconnect penuh)**.
  - Lisensi MIT disebut tapi file `LICENSE` belum ada → **selesai**.
  - Testing/QA → **unit test dasar selesai; QA browser dasar selesai**.

---

## 1. Inisialisasi Proyek (Foundation)

- [x] Inisialisasi `package.json` (name, scripts `start` & `dev`, metadata).
- [x] Pasang dependensi: `express`, `socket.io`, `nodemon` (dev).
- [x] Buat struktur folder sesuai README (`public/`, `public/css/`, `public/js/`, `src/`).
- [x] Tambahkan `.gitignore` (node_modules, logs, env).
- [x] Tambahkan `LICENSE` (MIT).
- [x] Siapkan env/config (`PORT`, `CORS_ORIGIN`, `MAX_ROOMS`, `ROOM_IDLE_MS`, dan timeout gameplay) via `process.env`.

## 2. Backend — Server & Room Management

### 2.1 `src/server.js`
- [x] Setup Express + static serving `public/`.
- [x] Buat HTTP server & attach Socket.io (CORS configurable).
- [x] Event handlers: `createRoom`, `joinRoom`, `startGame`, `discardTile`, `actionClaim`, `chatMessage`, `leaveRoom`, `disconnect`, `requestState`.
- [x] Validasi payload & rate limiting dasar.
- [x] Lock room saat game berlangsung (prevent late join).

### 2.2 `src/RoomManager.js`
- [x] Model data `Room`: code, players[], state, host, max 2–4.
- [x] Generate kode room unik (6 char).
- [x] Handler join/leave, transfer host saat leave/disconnect.
- [x] Bot fill opsional & flag `isBot`.
- [x] Broadcast `updateGameState` personal per client (setiap pemain hanya melihat hand sendiri).
- [x] Cleanup room kosong.
- [x] Kick player oleh host sebelum game dimulai.
- [x] Cleanup room kosong dan room tidak aktif.

## 3. Backend — Mahjong Engine

### 3.1 Deck & Distribusi (`src/MahjongEngine.js`)
- [x] Generate 136 batu (Bamboo, Coin, Character 1–9 ×4; Wind ×4; Dragon ×4).
- [ ] Shuffle deterministik (seedable untuk debugging).
- [x] Deal 13 ke setiap pemain; dealer dapat 14.
- [x] Manage *wall* & indeks draw.

### 3.2 Turn & Draw/Discard
- [x] State giliran (`currentTurn`, phase `discard`/`claim`).
- [x] Draw dari wall otomatis saat turn berpindah.
- [ ] Emit event `drawTile` khusus/personalisasi.
- [x] Validasi kepemilikan batu saat discard.
- [x] Discard pile + last discard untuk UI.
- [x] Timeout per giliran dengan auto-discard setelah 30 detik.

### 3.3 Klaim (Chi/Pong/Gang/Hu)
- [x] Window klaim singkat setelah discard (5s).
- [x] Validasi Chi: hanya pemain kiri dealer order; urutan 3.
- [x] Validasi Pong: kembar 3.
- [x] Validasi Gang dari discard, concealed, dan promoted.
- [x] Validasi Hu: form `(4×3)+2` (melds sequences/triplets + pair) + meld area.
- [x] Prioritas klaim: Hu > Gang > Pong > Chi; resolusi tie & broadcast.
- [x] Broadcast hasil klaim & pindah batu ke meld.
- [x] Gang replacement draw.

### 3.4 Kondisi Akhir & Skor
- [x] Deteksi kemenangan (Hu) & akhir wall (draw game).
- [x] Hitung skor dasar (1 poin, bonus 1 per Gang; dibayar setiap lawan).
- [x] Reset round dan rotasi dealer bila dealer tidak menang.

## 4. Real-time & Sinkronisasi

- [x] Desain `gameState` payload (publik vs privat).
- [x] Event `gameStarted`, `discardTile`, `actionClaim`, `updateGameState`.
- [ ] Event `drawTile` khusus.
- [x] Reconnect berbasis token sesi dan pemulihan state.
- [x] `requestState` untuk state resync.
- [x] Disconnect mid-game (convert ke bot) dan leave room via `leaveRoom`.
- [x] Chat event + sanitasi dasar (sanitasi rendering di client; server perlu rate limit).

## 5. Frontend

### 5.1 `public/index.html`
- [x] Layout lobby: create/join room, nama, total pemain 2–4.
- [x] Layout game: papan 4 kursi relatif ke pemain, wall count, last discard, meld area, chat, action buttons.
- [ ] Daftar room aktif.
- [x] Responsif dasar via Tailwind (CDN).

### 5.2 `public/js/client.js`
- [x] Koneksi Socket.io + lobby create/join/leave.
- [x] Event listeners & emit discard/claim/chat.
- [x] State management lokal & update UI.
- [ ] Timer klaim countdown & disable action saat bukan giliran.
- [x] Tombol Keluar Room & kembali ke lobby.

### 5.3 `public/js/ui.js`
- [x] Rendering tile dasar (bukan sprite, teks code).
- [ ] Animasi draw/discard.
- [x] Hand sorting & selection dasar.
- [ ] Highlight klaim valid & modal konfirmasi Hu.
- [x] Log/toast dasar.

### 5.4 `public/js/mahjongCore.js`
- [x] Mapping tile code ↔ label/warna.
- [x] Helper sorting data engine (server) & tile mapping client.
- [ ] Helper validasi sisi client untuk preview.

### 5.5 `public/css/style.css`
- [ ] Tailwind directives/PostCSS build.
- [x] Styling utama via utility class Tailwind di HTML.
- [ ] Custom tile size/orientation.

## 6. Bot/AI (Opsional)

- [x] Bot auto-fill sesuai maxPlayers.
- [x] Strategi dasar: discard tile paling sedikit/duplikat & honour; klaim Pong/Gang/Hu bila memungkinkan.
- [x] Delay bot (non-blocking).
- [ ] Strategi lebih pintar (danger tiles, chow preference, scoring).

## 7. Keamanan & Kualitas

- [x] Server-authoritative: semua validasi game di server.
- [x] Rate limiting socket & validasi tipe/ukuran payload dasar.
- [x] Sanitasi chat pada rendering client (escape HTML).
- [ ] Logging/observability terstruktur.
- [ ] Error boundary global.
- [x] Graceful shutdown untuk SIGINT/SIGTERM.

## 8. Testing & QA

- [x] Unit test `MahjongEngine` dasar (deck, shuffle, Chi/Pong/Gang).
- [x] QA browser dasar (render tanpa console error, create/join, start game, tombol keluar).
- [ ] Integration test socket events (create/join/discard/claim/leave).
- [ ] Manual QA multiplayer 2–4 tab + disconnect scenarios.
- [ ] Cross-browser & mobile responsiveness.
- [ ] Performance test (10+ rooms).

## 9. Dokumentasi & DevEx

- [x] Package scripts dasar (`start`, `dev`, `test`).
- [ ] Perbarui README sesuai implementasi final.
- [ ] Dokumentasi event payload & state schema.
- [ ] Deploy (PM2/Docker) opsional.

## 10. Milestone Prioritas (MVP)

**Milestone 1 — Lobby & Room (tanpa game logic)**
- [x] Room create/join + chat dasar + list pemain.

**Milestone 2 — Gameplay Dasar**
- [x] Deal, draw, discard, turn cycle, update state.

**Milestone 3 — Klaim & Kemenangan**
- [x] Chi/Pong/Gang/Hu + prioritas + Hu detection.

**Milestone 4 — Robustness**
- [x] Bot fill basic + timeout klaim 5s.
- [x] Leave room (human keluar, seat jadi bot).
- [x] Reconnect berbasis token & timeout per giliran.

**Milestone 5 — Polish**
- [ ] Animasi, responsive penuh, testing lanjutan, dokumentasi.

---

### Catatan Implementasi
- Server adalah sumber kebenaran; client hanya render.
- State dikirim personal per socket agar hand pemain lain tidak bocor.
- Mendukung total pemain 2–4; jika host klik Start dan kursi belum penuh, bot akan mengisi.
- Tombol **Keluar Room** memindahkan seat human ke bot jika game sedang berjalan, atau menghapus pemain jika masih di lobby.
