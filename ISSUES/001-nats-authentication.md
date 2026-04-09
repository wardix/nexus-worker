# Issue: Add NATS Authentication Support

## 📝 Deskripsi
Saat ini, `nexus-worker` hanya mendukung koneksi NATS tanpa autentikasi (anonim). Kita perlu menambahkan dukungan untuk autentikasi menggunakan **Username/Password** atau **Token** agar aplikasi bisa terhubung ke server NATS yang diproteksi.

## 🎯 Tujuan
- Mengizinkan pengguna untuk menyediakan kredensial NATS melalui variabel lingkungan (Environment Variables).
- Memastikan `nexus-worker` mengirimkan kredensial tersebut saat melakukan jabat tangan (handshake) koneksi ke NATS.

---

## 🛠 Langkah-Langkah Implementasi (Instruksi untuk AI)

### 1. Perbarui Skema Konfigurasi (`src/config/env.ts`)
Tambahkan field opsional baru ke dalam `envSchema` menggunakan Zod:
- `NATS_USER`: string opsional.
- `NATS_PASS`: string opsional.
- `NATS_TOKEN`: string opsional.

**Contoh Kode:**
```typescript
const envSchema = z.object({
  // ... field yang sudah ada
  NATS_USER: z.string().optional(),
  NATS_PASS: z.string().optional(),
  NATS_TOKEN: z.string().optional(),
});
```

### 2. Perbarui Logika Koneksi (`src/main.ts`)
Ubah pemanggilan fungsi `connect()` agar menyertakan kredensial dari `ENV`. Gunakan properti `user`, `pass`, dan `token`.

**Contoh Kode:**
```typescript
const nc = await connect({ 
  servers: ENV.NATS_URL,
  user: ENV.NATS_USER,
  pass: ENV.NATS_PASS,
  token: ENV.NATS_TOKEN,
});
```
*Catatan: Library `nats` akan secara otomatis mengabaikan nilai `undefined` pada properti tersebut.*

### 3. Perbarui Dokumentasi Environment (`.env.example`)
Tambahkan variabel baru ke dalam file `.env.example` sebagai panduan bagi developer lain.

**Tambahkan baris berikut:**
```bash
# NATS Authentication (Opsional)
# Gunakan NATS_USER & NATS_PASS ATAU NATS_TOKEN
NATS_USER=
NATS_PASS=
NATS_TOKEN=
```

---

## ✅ Kriteria Penerimaan (Definition of Done)
1. Aplikasi tetap bisa berjalan (build sukses).
2. Jika variabel lingkungan diisi, aplikasi mengirimkan kredensial tersebut saat booting.
3. File `.env.example` mencerminkan perubahan terbaru.

## 💡 Tips untuk AI
- Pastikan tidak menghapus konfigurasi yang sudah ada.
- Gunakan `ENV.NATS_USER`, `ENV.NATS_PASS`, dan `ENV.NATS_TOKEN` yang sudah di-parse oleh Zod.
