# 🀄 Online Multiplayer Mahjong Game

Aplikasi game **Mahjong Multiplayer** berbasis web secara real-time yang dibangun menggunakan **HTML5**, **Tailwind CSS**, **JavaScript (ES6+)**, dan **Socket.io**.

---

## 📌 Fitur Utama

- **Real-Time Multiplayer:** Permainan interaktif 4 pemain dalam satu ruangan (*room*) menggunakan Socket.io.
- **Lobby & Room System:** Buat ruangan baru, bergabung ke ruangan yang ada via Room Code, atau undang teman.
- **Visual UI Modern & Responsif:** Tampilan papan Mahjong yang rapi, *clean*, dan responsif berkat **Tailwind CSS**.
- **Logika & Kombinasi Game Lengkap:**
  - Penataan dan pengocokan batu (*Tiles Shuffle & Wall*).
  - Mekanisme **Draw** (ambil batu) dan **Discard** (buang batu).
  - Aksi Khusus: **Chi** (Urutan), **Pong** (Kembar 3), **Gang** (Kembar 4), dan **Hu / Mahjong** (Klaim Kemenangan).
- **Chat Interaktif:** Fitur obrolan langsung di dalam ruangan game.
- **Bot/AI Fill (Opsional):** Kemampuan untuk menambahkan pemain bot jika kuota 4 pemain belum terpenuhi.

---

## 🛠️ Teknologi yang Digunakan

- **Frontend:**
  - HTML5 (Struktur Antarmuka)
  - Tailwind CSS (Desain & Responsivitas via CDN/PostCSS)
  - Vanilla JavaScript / Client-side JS (Manipulasi DOM & Komunikasi Socket)
- **Backend:**
  - Node.js & Express.js (Web Server)
  - Socket.io (Protokol WebSocket untuk Komunikasi Real-time)

---

## 📂 Struktur Proyek

```text
mahjong-game/
├── public/
│   ├── index.html         # Halaman Utama / Lobby / Canvas Game
│   ├── css/
│   │   └── style.css      # Kustomisasi CSS & Tailwind directives
│   └── js/
│       ├── client.js      # Handler Socket.io Client & Event Listeners
│       ├── ui.js          # Rendering UI batu mahjong, animasi, & papan
│       └── mahjongCore.js # Helper logika visual (sorting, tile mapping)
├── src/
│   ├── server.js          # Main Express & Socket.io Server
│   ├── RoomManager.js     # Pengelola room, player list, dan lobby state
│   └── MahjongEngine.js   # Logika inti Mahjong (deck, turn, validation Chi/Pong/Hu)
├── package.json           # Dependensi Node.js
└── README.md              # Dokumentasi Proyek
```

---

## 🎮 Aturan & Alur Permainan

1. **Persiapan:**
   - Total terdapat 136 batu (Bambu 1-9, Koin 1-9, Karakter 1-9, Angin, Naga).
   - Masing-masing pemain mendapatkan 13 batu di awal permainan. Pemain pertama (*Dealer*) mengambil batu ke-14.
2. **Giliran (Turn Cycle):**
   - Pemain yang giliran mengambil batu (*Draw*) dari tumpukan.
   - Pemain memilih 1 batu untuk dibuang (*Discard*).
3. **Reaksi Pemain Lain (Interrupts):**
   - Saat ada batu dibuang, pemain lain mendapat waktu singkat untuk melakukan klaim:
     - **Chi:** Ambil batu buangan untuk melengkapi urutan 3 batu (hanya dari pemain di sebelah kiri).
     - **Pong:** Ambil batu buangan untuk melengkapi kembar 3.
     - **Gang:** Ambil batu buangan untuk melengkapi kembar 4.
     - **Hu / Mahjong:** Ambil batu untuk melengkapi susunan $(4 \times 3) + 2$ dan memenangkan permainan.

---

## 🚀 Cara Menjalankan Proyek

### 1. Prasyarat
Pastikan Anda sudah menginstal [Node.js](https://nodejs.org/) (versi 16 atau lebih baru) di komputer Anda.

### 2. Instalasi Dependensi
Buka terminal di direktori proyek dan jalankan:
```bash
npm install
```

### 3. Menjalankan Server
Jalankan server Node.js:
```bash
# Mode Produksi
npm start

# Mode Pengembangan (dengan Nodemon jika ada)
npm run dev
```

### 4. Membuka Aplikasi
Buka browser dan akses:
```text
http://localhost:3000
```
Buka beberapa tab browser atau perangkat berbeda dalam jaringan yang sama untuk menguji mode multiplayer.

---

## 📡 Event Socket.io yang Digunakan

| Event Name | Direction | Deskripsi |
| :--- | :--- | :--- |
| `createRoom` | Client ➔ Server | Membuat room baru |
| `joinRoom` | Client ➔ Server | Bergabung ke room yang ada |
| `gameStarted` | Server ➔ Client | Memulai game dan membagikan kartu awal |
| `drawTile` | Server ➔ Client | Mengirimkan batu baru ke pemain yang gilirannya tiba |
| `discardTile` | Client ➔ Server | Pemain membuang 1 batu |
| `actionClaim` | Client ➔ Server | Pemain melakukan klaim (Chi/Pong/Gang/Hu) |
| `updateGameState`| Server ➔ Client | Memperbarui tampilan papan untuk seluruh pemain |

---

## 📄 Lisensi
[MIT License](LICENSE) - Bebas dikembangkan dan dimodifikasi.