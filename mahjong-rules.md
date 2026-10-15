# Panduan Mahjong — Aturan & Cara Main

*Referensi singkat berdasarkan implementasi di repository ini (136 batu, 2–4 pemain, server-authoritative).*

---

## 1. Tipe Batu (136 total)

| Kode | Suit | Conoc (conol) | Conok (tong) | Man (man) | Badai | Sang |
|------|------|--------------|-------------|----------|-------|------|
| `B1‑B9` | **Bambu** (B) | 1–9 | | | | |
| `K1‑K9` | **Duit** (K) | 1–9 | | | | |
| `M1‑M9` | **Karakter** (M) | 1–9 | | | | |
| `WE` | **East** | | | | | |
| `WS` | **South** | | | | | |
| `WW` | **West** | | | | | |
| `WN` | **North** | | | | | |
| `DR` | **Red** | | | | | |
| `DG` | **Green** | | | | | |
| `DW` | **White** | | | | | |

- Setiap kode muncul **4 kali** dalam deck (total 136).
- hanya batu **suited** (B, K, M) yang bisa membentuk **Sequence (Chi)**.

---

## 2. Tujuan Game

Membentuk **tangan menang** yang terdiri dari:

- **4 meld** (kumpulan 3 batu) + **1 pasangan** (2 batu sama)
- Meld bisa berupa Sequence (Chi) atau Triplet (Pong/Gang)
- Total 14 batu di tangan setelah giliran selesai (drawn + discards).

---

## 3. Penyiupan & Distribusi

- Setiap pemain terima **13 batu** (dealer 14).
- Sisa batu membentuk **wall** (tumpukan draw).
- Giliran tiap giliran: **draw 1 batu dari wall** → **pilih 1 batu untuk dibuang** → **window klaim 5 detik**.

---

## 4. Jenis Meld & Klaim

Setelah lawan membuang, terbuka **window 5 detik**. Pemain lain bisa menekan tombol sesuai kemampuan tangannya:

| Jenis | Syarat | Conoc | Catatan |
|-------|--------|-------|---------|
| **Chi (Sequence)** | Batu suited (B/K/M), 3 urut | `B4‑B5‑B6` | Hanya pemain **kiri urutan** yang boleh klaim. |
| **Pong (Triplet)** | 3 batu **sama** identik | `K7‑K7‑K7` | Bisa dari discards atau tangan. |
| **Gang (Kong)** | 4 batu **sama** identik | `DR‑DR‑DR‑DR` | Dapat dari discards (ambil + punya 2) atau dari tangan (3 + tambahan). |
| **Hu (Menang)** | Tangan bisa diformat **(4×3)+2** | — | Prioritas tertinggi → game selesai. |

---

## 5. Prioritas Klaim (ketika sama-sama bisa)

Jika banyak pemain yang bisa klaim pada window yang sama, urutan dari **tertinggi**:

1. **Hu** — menang langsung, game selesai.
2. **Gang** — 4 batu sama, ganti batu dari tangan (draw replacement).
3. **Pong** — 3 batu sama dari discards.
4. **Chi** — sequence 3 suited, hanya pemain kiri urutan.

Jika ada tie (2 pemain bisa Hu), aturan ini menggunakan **first claim** (yang pertama kali valid).

---

## 6. Menang (Hu) — Detail

Tangan valid harus bisa diformat jadi **4 meld + 1 pasangan**:

- Conok: 2 sequence + 2 triplet + pasangan sama
- Conok: 4 triplet + pasangan sama
- Conok: 1 sequence + 3 triplet + pasangan sama
- dll.

Setiap lawan membayar **1 poin dasar + 1 poin per Gang** yang dibuat selama ronde.

---

## 7. Alur Giliran (per ronde)

1. **Draw** — otomatis 1 batu dari wall saat turn berpindah.
2. **Pilih & buang** — pemain memilih 1 batu dari tangan lalu membuang ke *discard river*.
3. **Window klaim 5s** — lawan lain teksi **Chi / Pong / Gang / Hu**.
4. **Jika tidak ada klaim** — giliri berpindah ke pemain berikutnya, batu terbuang tetap terlihat.
5. **Selesai giliran** — giliran berlanjut.

---

## 8. Perbandingan dengan Game Lain

| Game | Mahjong |
|------|---------|
| **41** | Mahjong pakai **136 tile**, goal membentuk kombinasi, bukan total poin 41. |
| **Remi** | Mahjong punya **meld & pasangan**, bukan sekadar pasangan kartu. |
| **Sanggong** | Mirip kalau **4 meld + 1 pasangan**, tapi Mahjong punya **klaim interaktif** lawan. |
| **Poker** | Mahjong **tidak ada taruhan/bluff** seperti poker; ini game informasi semi-simpul. |

---

## 9. Tips Praktis

- **Lihat capability** di sudut kanan bawah setelah game mulai — ini menampilkan tombol apa saja yang bisa Anda tekan.
- **Chi hanya boleh dari pemain kiri urutan** — jika Anda bukan pemain berikutnya, tombol Chi akan disable.
- **Hu bisa dari tangan sendiri** (bukan dari discards) — teknan **Hu** ketika sudah valid kemenangan.
- **Gang menambah skor** tetapi mengurangi sisa tangan — berhati-hati jika lawan sudah dekat menang.
- **Batu "kurang berguna"** (bukan membantu sequence/triplet) biasanya kandidat buang terbaik di awal giliran.

---

## 10. Referensi Kode

- **Validasi engine**: `src/MahjongEngine.js` — `validateChi`, `validatePong`, `validateGang`, `isWinningHand`.
- **Event client**: `public/js/ui.js` — event delegation click tile (`data-tile`).
- **Event server**: `src/server.js` — `discardTile`, `actionClaim`, `updateGameState`.
- **Capability & tombol**: `public/js/ui.js` — `setEnabled('discardSelectedBtn', caps.discard)` & tombol claim.

---

*Semulia mainan untuk dipahami. Selamat bermain!*