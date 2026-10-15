# agents.md — Aturan Kerja (Wajib)

 Berlaku untuk semua kontributor/agen yang bekerja di repository ini.

## Aturan Utama: Commit & Push Setiap Task

- **Setiap task, sekecil apa pun, WAJIB segera di-commit dan di-push** setelah selesai (tidak menumpuk perubahan).
- Tidak boleh meninggalkan perubahan "setengah jadi" tanpa commit; jika task dibatalkan/tertunda, commit sebagai WIP atau revert.
- Satu task = satu commit yang fokus (jangan campur perubahan tidak terkait).
- Format pesan commit: `type(scope): deskripsi singkat`  
  Contoh: `feat(room): tambah createRoom handler`, `fix(engine): perbaiki validasi Hu`, `docs(todo): tambah TODO.md`.
- Selalu push ke remote setelah commit: `git push`.

## Alur Wajib Per Task

1. Buat/ubah file sesuai task.
2. Verifikasi (test/build/lint jika ada) — minimal baca/self-check.
3. `git add -A`
4. `git commit -m "type(scope): deskripsi"`
5. `git push`
6. Konfirmasi status bersih: `git status` (harus bersih, kecuali perubahan baru yang sedang dikerjakan).

## Larangan

- Tidak boleh commit kredensial/secrets (`.env`, API key, token).
- Tidak boleh push langsung ke branch protected tanpa review (gunakan PR) bila ada aturan proteksi branch.
- Tidak boleh menahan commit dengan alasan "nanti digabung" — push setiap task.

## Catatan

- Jika repository belum/init git, inisialisasi dulu: `git init`, tambahkan remote, lalu ikuti alur di atas.
- Semua perubahan dokumentasi (README, TODO, agents.md) juga termasuk task dan wajib commit & push.

Dengan aturan ini, riwayat perubahan selalu sinkron dan setiap task dapat ditelusuri.