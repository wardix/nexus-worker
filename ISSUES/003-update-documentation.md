# Issue: Update README.md and GEMINI.md for Recent Changes

## 📝 Deskripsi
Setelah mengimplementasikan autentikasi NATS dan BiomeJS, dokumentasi proyek (`README.md` dan `GEMINI.md`) perlu diperbarui agar mencerminkan standar terbaru dan fitur-fitur baru yang tersedia.

## 🎯 Tujuan
- Menambahkan panduan *formatting* dan *linting* menggunakan BiomeJS ke `README.md`.
- Menjelaskan dukungan autentikasi NATS di `README.md`.
- Memperbarui instruksi konteks untuk AI di `GEMINI.md` agar selalu mengikuti standar BiomeJS dan mendukung autentikasi NATS.

---

## 🛠 Langkah-Langkah Implementasi

### 1. Perbarui `README.md`
- Tambahkan bagian **Code Quality** yang menjelaskan perintah `bun run format`, `bun run lint`, dan `bun run check`.
- Perbarui bagian **Environment Variables** untuk mencantumkan variabel autentikasi NATS (`NATS_USER`, `NATS_PASS`, `NATS_TOKEN`).

### 2. Perbarui `GEMINI.md`
- Tambahkan aturan di bagian **Core Architecture & Best Practices** mengenai kewajiban penggunaan BiomeJS untuk menjaga konsistensi kode.
- Masukkan informasi tentang ketersediaan variabel autentikasi NATS di bagian konfigurasi.

---

## ✅ Kriteria Penerimaan (Definition of Done)
1. `README.md` mencantumkan informasi BiomeJS dan NATS Auth.
2. `GEMINI.md` mencantumkan standar BiomeJS terbaru.
3. Perubahan diajukan melalui Pull Request.
