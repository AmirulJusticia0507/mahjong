# TODO — Online Multiplayer Mahjong

Berdasarkan analisa `readme.md`. Status awal: **hanya dokumentasi tersedia**, belum ada source code. Urutan disusun agar bisa dikerjakan bertahap dari fondasi hingga fitur multiplayer & game logic.

## 0. Analisa Singkat Dokumentasi

- **Kekuatan:** cakupan fitur lengkap (lobby, room, real-time socket, Chi/Pong/Gang/Hu, chat, bot opsional), alur game & event Socket.io terdefinisi jelas, struktur proyek & tech stack jelas.
- **Kekurangan / yang perlu dikerjakan:**
  - Belum ada `package.json`, `src/`, `public/`.
  - Definisi format `Room`, `Player`, & state game belum ada (server-authoritative vs client).
  - Aturan validasi Chi/Pong/Gang/Hu (termasuk prioritas klaim & timeout) belum dirinci.
  - Bot/AI hanya opsional, tidak ada detail perilaku.
  - Tidak ada strategi penanganan disconnect/reconnect, sinkronisasi state, keamanan input.
  - Lisensi MIT disebut tapi file `LICENSE` belum ada.
  - Tidak ada skenario testing/QA.

---

## 1. Inisialisasi Proyek (Foundation)

- [ ] Inisialisasi `package.json` (name, scripts `start` & `dev`, metadata).
- [ ] Pasang dependensi: `express`, `socket.io`, `nodemon` (dev).
- [ ] Buat struktur folder sesuai README (`public/`, `public/css/`, `public/js/`, `src/`).
- [ ] Tambahkan `.gitignore` (node_modules, logs, env).
- [ ] Tambahkan `LICENSE` (MIT).
- [ ] Siapkan env/config (port, origin, room limit) via `process.env`.

## 2. Backend — Server & Room Management

### 2.1 `src/server.js`
- [ ] Setup Express + static serving `public/`.
- [ ] Buat HTTP server & attach Socket.io (CORS configurable).
- [ ] Definisikan event handlers: `createRoom`, `joinRoom`, `discardTile`, `actionClaim`, `chatMessage`, `disconnect`.
- [ ] Validasi payload & rate limiting dasar.
- [ ] Lock room bila game sedang berlangsung (prevent late join kecuali spectator).

### 2.2 `src/RoomManager.js`
- [ ] Model data `Room`: id/code, players[], state (`waiting/playing/finished`), host, max 4.
- [ ] Generate kode room unik (6 char).
- [ ] Handler join/leave, kick, transfer host saat disconnect.
- [ ] Management bot fill (opsional) & flag `isBot`.
- [ ] Broadcast `updateGameState` ke semua client room.
- [ ] Cleanup room kosong & timeout.

## 3. Backend — Mahjong Engine

### 3.1 Deck & Distribusi (`src/MahjongEngine.js`)
- [ ] Generate 136 batu (Bamboo, Coin, Character 1–9 ×4; Wind ×4; Dragon ×4; bila pakai flower/season sesuaikan).
- [ ] Shuffle deterministik (seedable untuk debugging).
- [ ] Deal 13 ke setiap pemain; dealer dapat 14.
- [ ] Manage *wall* (sisa batu) & indeks draw.

### 3.2 Turn & Draw/Discard
- [ ] State giliran (`currentTurn`, phase `draw`/`discard`).
- [ ] `drawTile`: ambil dari wall, kirim hanya ke pemain terkait.
- [ ] `discardTile`: validasi kepemilikan batu; masukkan ke discard pile; ubah phase klaim.
- [ ] Timeout per giliran (auto-discard / skip) & notifier.

### 3.3 Klaim (Chi/Pong/Gang/Hu)
- [ ] Window klaim singkat setelah discard (mis. 5s).
- [ ] Validasi Chi: hanya pemain kiri dealer order; urutan 3 (bisa handle edge 1-2-3 / 7-8-9).
- [ ] Validasi Pong: kembar 3 (ambil 2 dari hand + discard).
- [ ] Validasi Gang: kembar 4 (concealed/added/promoted); draw replacement tile.
- [ ] Validasi Hu: form $(4\times3)+2$ (melds sequences/triplets + pair).
- [ ] Prioritas klaim: Hu > Pong/Gang > Chi; resolusi tie & broadcast.
- [ ] Broadcast hasil klaim & pemindahan batu ke meld area.

### 3.4 Kondisi Akhir & Skor
- [ ] Deteksi kemenangan (Hu) & akhir wall (draw game).
- [ ] Hitung skor dasar (fan/points) — bisa mulai minimal then extend.
- [ ] Reset round / next dealer logic (opsional).

## 4. Real-time & Sinkronisasi

- [ ] Desain `gameState` payload (publik vs privat: tiap pemain hanya melihat hand sendiri).
- [ ] Event `gameStarted`, `drawTile`, `discardTile`, `actionClaim`, `updateGameState`.
- [ ] Heartbeat/reconnect & state resync (requestState).
- [ ] Penanganan disconnect mid-game (bot fill / pause / forfeit).
- [ ] Chat event + sanitasi pesan (anti-XSS).

## 5. Frontend

### 5.1 `public/index.html`
- [ ] Layout lobby: create/join room, nama pemain, daftar room.
- [ ] Layout game: papan 4 pemain (top/right/bottom/left), wall count, discard piles, meld area, chat, action buttons (Chi/Pong/Gang/Hu/Pass).
- [ ] Responsif (Tailwind via CDN/PostCSS).

### 5.2 `public/js/client.js`
- [ ] Koneksi Socket.io & reconnection.
- [ ] Event listeners & emit create/join/discard/claim/chat.
- [ ] State management lokal & update UI.
- [ ] Timer klaim & disable action saat bukan giliran.

### 5.3 `public/js/ui.js`
- [ ] Rendering tile (img/css sprite), animasi draw/discard.
- [ ] Hand sorting & selection.
- [ ] Highlight klaim valid & modal konfirmasi Hu.
- [ ] Toast/notification & error handling.

### 5.4 `public/js/mahjongCore.js`
- [ ] Mapping tile code ↔ visual asset.
- [ ] Helper sorting (suit → number → honour).
- [ ] Helper validasi sisi client (preview Chi/Pong/Hu), bukan sumber kebenaran.

### 5.5 `public/css/style.css`
- [ ] Tailwind directives & custom styles (tile size, orientations, responsive).

## 6. Bot/AI (Opsional)

- [ ] Interface `BotPlayer` dengan metode decideDiscard/decideClaim.
- [ ] Strategi dasar: discard random / tile paling sedikit duplikat, klaim Pong/Gang jika memungkinkan, Hu jika tersedia.
- [ ] Tetapkan delay (simulasi berpikir) & non-blocking.

## 7. Keamanan & Kualitas

- [ ] Server-authoritative: semua validasi di server; client hanya render.
- [ ] Rate limiting socket & validasi tipe/ukuran payload.
- [ ] Sanitasi chat & nama pemain.
- [ ] Logging (info/warn/error) & observability dasar.
- [ ] Error boundary & graceful shutdown.

## 8. Testing & QA

- [ ] Unit test `MahjongEngine` (deck, shuffle, Hu validation, Chi/Pong).
- [ ] Integration test socket events (create/join/discard/claim).
- [ ] Manual QA multiplayer 4 tab + disconnect scenarios.
- [ ] Cross-browser & mobile responsiveness.
- [ ] Performance test (10+ rooms) bila perlu.

## 9. Dokumentasi & DevEx

- [ ] Perbarui README bila implementasi menyimpang dari struktur.
- [ ] Dokumentasi event payload & state schema.
- [ ] Script `npm run dev`, lint/format (opsional).
- [ ] Panduan deploy (PM2 / Docker) (opsional).

## 10. Milestone Prioritas (MVP)

**Milestone 1 — Lobby & Room (tanpa game logic)**
- [ ] Room create/join + chat dasar + list pemain.

**Milestone 2 — Gameplay Dasar**
- [ ] Deal, draw, discard, turn cycle, update state.

**Milestone 3 — Klaim & Kemenangan**
- [ ] Chi/Pong/Gang/Hu + prioritas + Hu detection.

**Milestone 4 — Robustness**
- [ ] Reconnect, disconnect handling, bot fill, timeout.

**Milestone 5 — Polish**
- [ ] Animasi, responsive, testing, dokumentasi.

---

### Catatan Implementasi
- Pastikan tidak ada state game kritis di client; server adalah sumber kebenaran.
- Definisikan kontrak payload Socket.io terlebih dulu sebelum coding UI.
- Prioritaskan `MahjongEngine` yang testable (pure functions) agar mudah diuji.