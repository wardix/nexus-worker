# Nexus Worker

Nexus Worker adalah *next-generation NATS consumer* yang dirancang untuk stabilitas, *developer experience* (DX) yang tinggi, dan kemudahan pemeliharaan (*maintainability*). Proyek ini menggunakan **Bun**, **TypeScript**, **NATS JetStream**, dan **Zod** untuk validasi skema pesan.

## 🚀 Fitur Utama

- **Type-Safe Configuration:** Validasi *environment variables* menggunakan Zod saat *booting*. Aplikasi tidak akan menyala jika konfigurasi tidak valid (Fail-fast).
- **Type-Safe Message Payload:** Setiap pesan dari NATS divalidasi skemanya dengan Zod sebelum diproses, memastikan tidak ada data korup yang masuk ke logika bisnis.
- **Boilerplate Reduction:** Menggunakan arsitektur `BaseJob` sehingga *developer* hanya perlu fokus menulis *business logic*. Urusan *Acknowledge* (ACK), *Negative Acknowledge* (NAK), penanganan *error*, dan ekstraksi *trace ID* sudah ditangani secara otomatis.
- **Graceful Shutdown:** Saat server di-*restart* (misal via `SIGINT` atau `SIGTERM`), *worker* akan menyelesaikan pemrosesan pesan yang sedang berjalan terlebih dahulu sebelum mematikan koneksi secara aman, mencegah data *corrupt*.
- **Structured Logging:** Menggunakan **Pino** untuk log berformat JSON yang kaya konteks (menyertakan `traceId` di setiap log).

## 🛠 Instalasi & Cara Menjalankan

### Prasyarat

- [Bun](https://bun.sh/) (v1.0+)
- Server NATS (dengan JetStream aktif)

### Langkah-langkah

1. **Install dependensi:**
   ```bash
   bun install
   ```

2. **Persiapkan Environment Variables:**
   ```bash
   cp .env.example .env
   ```
   *Edit file `.env` dan sesuaikan dengan konfigurasi NATS Anda.*

3. **Jalankan Worker (Mode Development):**
   ```bash
   bun run dev
   ```
   *Perintah ini menggunakan fitur `--hot` dari Bun untuk *auto-reload* saat kode berubah.*

4. **Jalankan Worker (Mode Production):**
   ```bash
   bun run start
   ```

## 🏗 Cara Menambahkan Pekerjaan (Job) Baru

Menambahkan *job* baru sangat mudah. Ikuti langkah berikut:

### 1. Buat File Job Baru

Buat file baru di dalam direktori `src/domains/<nama-domain>/jobs/`, misalnya `src/domains/ticket/jobs/close-ticket.job.ts`.

### 2. Implementasikan `BaseJob`

*Extend* class `BaseJob` dan implementasikan 3 hal utama:
1. `subject`: Routing key NATS untuk *job* ini.
2. `validatePayload`: Gunakan Zod untuk memvalidasi *payload* pesan.
3. `handle`: Tempatkan logika bisnis utama Anda di sini.

**Contoh Template:**

```typescript
import { z } from 'zod';
import { BaseJob } from '../../../core/base-job';
import { logger } from '../../../core/logger';
import { JsMsg } from 'nats';

// 1. Definisikan Skema Payload
const PayloadSchema = z.object({
  ticketId: z.string().uuid(),
  reason: z.string(),
});

type Payload = z.infer<typeof PayloadSchema>;

// 2. Buat Class Job
export class CloseTicketJob extends BaseJob<Payload> {
  // Tentukan subject NATS
  readonly subject = 'ticket.action.close';

  // Validasi data yang masuk
  protected validatePayload(data: unknown): Payload {
    return PayloadSchema.parse(data);
  }

  // Tulis logika bisnis Anda
  protected async handle(payload: Payload, msg: JsMsg): Promise<void> {
    logger.info(`Menutup tiket ${payload.ticketId}...`);
    
    // ... Logika ke database atau API eksternal ...
    
    logger.info(`Tiket berhasil ditutup.`);
  }
}
```

### 3. Daftarkan Job di `main.ts`

Buka file `src/main.ts` dan tambahkan instansiasi *job* baru Anda ke dalam array `registeredJobs`:

```typescript
import { CloseTicketJob } from './domains/ticket/jobs/close-ticket.job';

// ...
  const registeredJobs = [
    new SendWelcomeEmailJob(),
    new CloseTicketJob(), // <--- Tambahkan di sini
  ];
// ...
```

Selesai! Worker kini siap mendengarkan pesan dengan *subject* `ticket.action.close`.

## 📂 Struktur Direktori

```text
src/
├── config/
│   └── env.ts            # Validasi Zod untuk environment variables
├── core/
│   ├── base-job.ts       # Abstrak class utama untuk semua job
│   └── logger.ts         # Konfigurasi Pino logger
├── domains/              # Pengelompokan logika berdasarkan domain/fitur
│   └── notification/
│       └── jobs/
│           └── send-welcome-email.job.ts
└── main.ts               # Entry point aplikasi
```
