# TODO — Online Multiplayer Mahjong

Terakhir diperbarui: 15 Oktober 2026.

Status saat ini: MVP sudah dapat membuat/join room, bermain 2–4 pemain dengan bot pengisi, menjalankan draw/discard dan klaim dasar, chat, serta keluar room. Checklist di bawah mencerminkan implementasi yang sudah ada; item yang masih parsial tetap belum dicentang dan diberi catatan.

## 1. Foundation

- [x] Inisialisasi `package.json` dengan script `start`, `dev`, dan `test`.
- [x] Pasang `express`, `socket.io`, dan `nodemon`.
- [x] Buat struktur dasar `public/`, `public/js/`, dan `src/`.
- [x] Tambahkan `.gitignore` dan `LICENSE` MIT.
- [ ] Lengkapi konfigurasi environment untuk origin CORS dan batas room (saat ini baru `PORT`).

## 2. Backend — Server & Room

- [x] Setup Express, static serving, HTTP server, Socket.io, dan endpoint `/health`.
- [x] Implementasikan event `createRoom`, `joinRoom`, `startGame`, `discardTile`, `actionClaim`, `chatMessage`, `requestState`, `leaveRoom`, dan `disconnect`.
- [x] Buat room code unik 6 karakter dan state room `waiting` / `playing` / `finished`.
- [x] Dukung kapasitas room yang dapat dipilih: 2, 3, atau 4 pemain.
- [x] Batasi join ketika room penuh atau game sudah dimulai.
- [x] Tambahkan bot sampai kapasitas room saat host memulai game.
- [x] Transfer host ketika pemain keluar dari room yang masih menunggu.
- [x] Ubah kursi pemain menjadi bot ketika keluar/disconnect saat game berlangsung.
- [x] Hapus room kosong dan room yang hanya menyisakan bot setelah pemain keluar secara sengaja.
- [ ] Samakan cleanup disconnect dengan alur `leaveRoom`, termasuk cleanup room yang hanya berisi bot.
- [ ] Tambahkan kick player dan timeout room tidak aktif.
- [ ] Tambahkan validasi payload terpusat dan rate limiting socket.

## 3. Mahjong Engine & Gameplay

### Deck, distribusi, dan giliran

- [x] Generate 136 batu: Bamboo, Coin, Character, Wind, dan Dragon.
- [x] Shuffle dengan RNG yang dapat diinjeksi untuk test/debugging.
- [x] Deal 13 batu per pemain dan 14 untuk dealer, termasuk room 2–4 pemain.
- [x] Kelola wall, hand, discard pile, giliran, dan phase permainan.
- [x] Validasi discard berdasarkan giliran dan kepemilikan batu.
- [x] Akhiri permainan sebagai draw ketika wall habis.
- [x] Tambahkan timeout giliran pemain manusia (auto-discard setelah 30 detik).

### Klaim dan kemenangan

- [x] Buka window klaim 5 detik setelah discard.
- [x] Validasi dasar Chi, Pong, Gang, dan Hu di server.
- [x] Terapkan prioritas Hu > Gang > Pong > Chi dan tie-break berdasarkan urutan pemain.
- [x] Pindahkan batu hasil klaim ke meld dan lanjutkan giliran ke pengklaim.
- [x] Perbaiki validasi posisi Chi agar memakai jumlah pemain room, bukan konstanta 4.
- [x] Implementasikan Gang lengkap: concealed/added/promoted dan replacement draw.
- [x] Tambahkan tombol/pass event yang langsung mencatat pemain melewati klaim.
- [ ] Tambahkan perhitungan skor/fan dan next-round/dealer logic.

## 4. Sinkronisasi, Keamanan, dan Robustness

- [x] Kirim state privat: setiap pemain hanya melihat hand sendiri.
- [x] Sediakan `requestState` untuk meminta sinkronisasi state.
- [x] Batasi panjang chat hingga 300 karakter dan escape output chat di client.
- [ ] Implementasikan reconnect yang memulihkan identitas/kursi pemain dan state room.
- [ ] Sanitasi dan batasi nama pemain.
- [ ] Konfigurasikan CORS berdasarkan environment (saat ini menerima semua origin).
- [ ] Tambahkan logging terstruktur, error handling global, dan graceful shutdown.

## 5. Frontend

- [x] Buat lobby untuk nama, create room, join room, kode room, dan pilihan 2–4 pemain.
- [x] Buat tampilan game untuk pemain, hand, meld, wall, discard terakhir, action, chat, dan log.
- [x] Implementasikan koneksi Socket.io dan emit/listener event gameplay utama.
- [x] Tambahkan tombol keluar room dan kembalikan UI ke lobby setelah berhasil keluar.
- [x] Render batu dengan helper mapping warna/label dan hand yang dapat diklik untuk discard.
- [x] Nonaktifkan tombol klaim di luar phase klaim.
- [ ] Tampilkan timer klaim dan hanya aktifkan aksi yang valid untuk pemain terkait.
- [ ] Tambahkan pemilihan/sorting hand yang lebih baik, highlight klaim, dan konfirmasi Hu.
- [ ] Tambahkan toast/error state dan cegah log hasil akhir dirender berulang.
- [ ] Tambahkan stylesheet khusus, animasi, serta QA layout responsive/mobile.

## 6. Bot/AI

- [x] Bot otomatis discard dengan preferensi batu honour/singleton.
- [x] Bot otomatis mencoba Hu, Gang, Pong, lalu Chi.
- [x] Tambahkan delay agar aksi bot tidak instan dan timer dapat dibersihkan.
- [ ] Pisahkan strategi bot ke interface/module tersendiri agar mudah diuji dan dikembangkan.

## 7. Testing & QA

- [x] Tambahkan unit test dasar untuk deck, shuffle, sorting, Hu, Chi, Pong, dan Gang.
- [ ] Lengkapi unit test `RoomManager`; kapasitas 2–4 pemain, leave, host transfer, dan bot fill sudah tercakup, cleanup belum.
- [ ] Lengkapi test klaim; pass dan posisi Chi di room 3 pemain sudah tercakup, prioritas/tie-break/timeout belum.
- [ ] Tambahkan integration test Socket.io untuk create/join/start/leave/disconnect dan gameplay.
- [ ] Lakukan manual QA multiplayer 2–4 tab, bot, reconnect/disconnect, dan mobile.
- [ ] Tambahkan lint/format dan jalankan di CI.

## 8. Dokumentasi & Deployment

- [ ] Perbarui `readme.md` agar mencakup mode 2–4 pemain, `leaveRoom`, `requestState`, chat, dan bot behavior terbaru.
- [ ] Dokumentasikan seluruh payload event Socket.io dan schema game state.
- [ ] Tambahkan panduan deploy (PM2/Docker) dan konfigurasi production.

## Milestone

- [x] Milestone 1 — Lobby, create/join room, daftar pemain, dan chat dasar.
- [x] Milestone 2 — Deal, draw, discard, turn cycle, dan state privat.
- [x] Milestone 3 — Klaim dasar Chi/Pong/Gang/Hu dan deteksi kemenangan.
- [ ] Milestone 4 — Reconnect, timeout pemain, disconnect/cleanup konsisten, dan test integrasi.
- [ ] Milestone 5 — Skor, polish UI, responsive QA, dokumentasi lengkap, dan deployment.
