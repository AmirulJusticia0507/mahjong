# Online Multiplayer Mahjong

Game Mahjong real-time berbasis Node.js, Express, Socket.io, dan JavaScript vanilla. Aplikasi mendukung 2–4 pemain, bot pengisi, room privat, reconnect, klaim Chi/Pong/Gang/Hu, ronde lanjutan, skor dasar, chat, serta tampilan batu menggunakan glyph Unicode Mahjong standar.

## Persyaratan

- Node.js 20 atau lebih baru
- npm

## Menjalankan lokal

```bash
npm install
npm start
```

Buka `http://localhost:3000`. Untuk mode pengembangan dengan restart otomatis:

```bash
npm run dev
```

Verifikasi proyek:

```bash
npm test
npm run check
npm audit
```

## Konfigurasi

Salin `.env.example` bila platform deployment memuat file env secara otomatis, atau set environment variable langsung.

| Variable | Default | Keterangan |
| --- | ---: | --- |
| `PORT` | `3000` | Port HTTP server |
| `CORS_ORIGIN` | `*` | Origin frontend yang diizinkan |
| `MAX_ROOMS` | `100` | Batas room aktif |
| `ROOM_IDLE_MS` | `3600000` | Umur maksimum room tanpa aktivitas |
| `TURN_TIMEOUT_MS` | `30000` | Waktu pemain membuang batu |
| `CLAIM_TIMEOUT_MS` | `5000` | Durasi window klaim |
| `BOT_DELAY_MS` | `1200` | Jeda aksi bot |

## Cara bermain

1. Masukkan nama, pilih kapasitas 2–4 pemain, lalu buat room atau pilih room aktif.
2. Bagikan kode enam karakter agar pemain lain dapat bergabung.
3. Room otomatis mulai saat penuh; host juga dapat memulai lebih awal dan kursi kosong diisi bot.
4. Pilih batu lalu tekan **Buang Pilihan** pada giliran sendiri.
5. Setelah discard, pemain yang memenuhi syarat dapat Chi, Pong, Gang, Hu, atau Pass.
6. Gang dari tangan dan Hu dari tangan tersedia saat valid.
7. Setelah ronde selesai, host dapat memulai ronde berikutnya. Skor dasar adalah 1 poin ditambah 1 per Gang dan dibayar oleh setiap lawan.

Jika koneksi terputus, browser menyimpan token sesi di `sessionStorage`. Kursi sementara dimainkan bot dan dipulihkan ketika client tersambung kembali.

## Arsitektur state

Server adalah sumber kebenaran. `RoomManager` menyimpan room, pemain, wall, giliran, klaim, skor, dan timer. State dikirim secara personal: client hanya menerima isi hand miliknya sendiri, sedangkan pemain lain hanya menampilkan jumlah batu.

## Event Socket.io

### Client ke server

| Event | Payload utama | Fungsi |
| --- | --- | --- |
| `createRoom` | `{ name, maxPlayers }` | Membuat room 2–4 pemain |
| `joinRoom` | `{ code, name }` | Bergabung ke room |
| `startGame` | `{ code }` | Host memulai game dan mengisi bot |
| `discardTile` | `{ code, tile }` | Membuang batu terpilih |
| `actionClaim` | `{ code, type }` | Klaim `chi`, `pong`, `gang`, atau `hu` |
| `passClaim` | `{ code }` | Melewati window klaim |
| `declareGang` | `{ code, tile }` | Concealed/promoted Gang |
| `declareHu` | `{ code }` | Hu dari tangan sendiri |
| `nextRound` | `{ code }` | Host memulai ronde berikutnya |
| `chatMessage` | `{ code, message }` | Mengirim chat, maksimal 300 karakter |
| `requestState` | `{ code }` | Meminta state terbaru |
| `resumeSession` | `{ code, token }` | Memulihkan kursi setelah reconnect |
| `kickPlayer` | `{ code, playerId }` | Host mengeluarkan pemain sebelum game |
| `leaveRoom` | tanpa payload | Keluar dari room |

### Server ke client

| Event | Fungsi |
| --- | --- |
| `roomJoined` / `roomResumed` / `roomLeft` | Lifecycle room dan sesi |
| `updateGameState` | State privat pemain dan kemampuan aksi yang valid |
| `gameStarted` | Notifikasi ronde dimulai |
| `playerJoined` / `playerLeft` | Notifikasi pemain |
| `chatMessage` | Chat yang sudah dibatasi server |
| `kicked` | Pemain dikeluarkan host |
| `errorMessage` | Error yang aman ditampilkan ke pengguna |

Endpoint tambahan:

- `GET /health` — health check.
- `GET /api/rooms` — daftar room berstatus menunggu.

## Deployment

### Docker

```bash
docker build -t mahjong .
docker run --rm -p 3000:3000 --env-file .env mahjong
```

### PM2

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
```

Untuk production, set `CORS_ORIGIN` ke domain frontend sebenarnya dan jalankan di belakang reverse proxy HTTPS yang mendukung WebSocket.

## Struktur utama

```text
public/                  UI browser
src/MahjongEngine.js     helper dan validasi Mahjong
src/RoomManager.js       state room dan alur permainan
src/BotPlayer.js         strategi bot
src/server.js            HTTP dan Socket.io server
.github/workflows/ci.yml continuous integration
```

## Lisensi

[MIT](LICENSE)
