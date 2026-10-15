# 🏆 Cara Menang di Mahjong Multiplayer

*Ringkasan cepat untuk meningkatkan kemungkinan menang di game ini.*

---

## ✅ Syarat Menang (Hu) Minimum

Tangan valid harus bisa diformat jadi:

### **4 Meld + 1 Pasangan = 14 Batu**

| Meld | Penjelasan | Conoc |
|------|------------|-------|
| **Sequence (Chi)** | 3 batu warna sama urut | `B1‑B2‑B3`, `M5‑M6‑M7` |
| **Triplet (Pong/Gang)** | 3/4 batu sama identik | `K7‑K7‑K7` atau `DR‑DR‑DR‑DR` |

**Pasangan**: 2 batu identik sama sekali.

---

## 🎯 2 Cara Utama Menang

### 1. **Menang dari Diri (Self-Draw)**
- Anda draws batu dari wall yang langsung membentuk tangan menang.
- **Tips**: Saasinya mendekati kombinasi 4 meld + 1 pasangan, ambil batu yang "close" ke bentuk yang Anda butuhkan.

### 2. **Menang dari Discard Lawan**
- Lawan membuang batu, dan Anda bisa mengklaim **Hu** dengan batu tersebut.
- Harus memenuhi syarat meld/pasangan yang valid.
- **Prioritas**: Hu memiliki prioritas tertinggi kalau banyak orang bisa klaim.

---

## 🔀 Strategi Meningkatkan Peluang Menang

| Strategi | Penjelasan |
|----------|------------|
| **Hormati window 5 detik** | Jika lawan klaim Hu sebelum window tutup, game selesai. Jika Anda bisa Hu, tekan sebelum habis 5 detik. |
| **Focus pada suited (B/K/M)** | Sequence (Chi) hanya bisa dari batu Bambu/Kopi/Karakter. Bagi badai/sang hanya bisa jadi triplet/pasangan. |
| **Hawari "batu hidup"** | Batu yang masih berpotensi membantu sequence/triplet lawan lain adalah "batu mati" — hindari membuang yang sering diklaim lawan. |
| **Catat discards** | Batu apa saja yang sudah keluar membantu Anda tau pola yang sudah tidak mungkin muncul lagi. |
| **Gang dengan hira** | Setiap Gang menambah 1 poin dasar yang dibayar lawan. Jauhi Gang kalau Anda belum dekat menang (kurang efisien poin). |
| **Bot delay 1200ms** | Bot tidak sekpunakah — jadikan referensi giliran alami, bukan default strategi. |

---

## 🔔 Tanda "Ready" (Sedang Butuh 1 Batu)

Jika tangan Anda hanya butuh **1 batu** untuk menang, biasanya Anda akan merasa "serdeh" deket. Tanda-tanda:

- Sudah punya 4 meld (misal: 2 sequence + 2 triplet) + 1 pasangan.
- Hanya butuh batu X untuk menyelesaikan.
- Tekan **Hu** sewaktu-waktu (jika tombol enable) atau tunggu draw yang tepat.

---

## 💯 Tips Practis Cepat

1. **Aawali dengan membuang batu "duplikat"** yang tidak membantu sequence/triplet.
2. **Hawari warna dominan** di tangan Anda — fokus kembangkan suit yang ada.
3. **Jangan keras pada Gang** kalau belum pertoh menang — masing-masing Gang +1 poin lawan.
4. **Gunakan fitur "capability"** di sudut kanan bawah — lihat tombol apa saja yang bisa ditekan giliran Anda.
5. **Jika sudah punya kombinasi menang (Hu), tekanlah secepat possible** sebelum window klaim tutup atau lawan Klaim yang lebih tinggi prioritas.

---

## 🛠 Referensi Teknis (dari kode)

- **Validasi engine**: `src/MahjongEngine.js` → `isWinningHand(concealedTiles, fixedMeldCount)`
- **Event menang**: `declareHu` dikirim ke server, lalu `updateGameState` mengirim hasil ke semua klien.
- **Skor**: 1 poin dasar + 1 per Gang yang terjadi selama ronde.

---

*Semulia main untuk dipahami. Selamat mencoba Jackpot Hu-nya! 🎣*