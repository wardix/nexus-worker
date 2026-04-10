# Setup NATS Server for Nexus Worker

Dokumen ini berisi panduan untuk melakukan *setup* server NATS JetStream dan mengonfigurasinya agar sesuai dengan arsitektur **Nexus Worker**.

## 🚀 1. Menjalankan NATS Server

Cara termudah untuk menjalankan NATS adalah menggunakan **Docker**. Pastikan fitur **JetStream** aktif (`-js`).

### Menjalankan via Docker CLI
```bash
docker run -d \
  --name nats-main \
  -p 4222:4222 \
  -p 8222:8222 \
  nats:latest -js
```

### Menjalankan via Docker Compose
Jika Anda menggunakan `docker-compose.yml`, tambahkan konfigurasi berikut:
```yaml
services:
  nats:
    image: nats:latest
    ports:
      - "4222:4222"
      - "8222:8222"
    command: "-js"
```

---

## 🛠 2. Konfigurasi JetStream via NATS CLI

Setelah server menyala, Anda perlu mengonfigurasi **Stream** dan **Consumer**. Instal [NATS CLI](https://github.com/nats-io/natscli) terlebih dahulu.

### A. Membuat Stream (`NEXUS_STREAM`)
Nexus Worker memerlukan sebuah stream untuk menampung pesan. Stream ini akan menangkap semua pesan yang diawali dengan subjek `NEXUS_STREAM.`.

```bash
nats stream add NEXUS_STREAM \
  --subjects "NEXUS_STREAM.>" \
  --storage file \
  --retention limits \
  --max-msgs -1 \
  --max-bytes -1 \
  --discard old
```

### B. Membuat Durable Consumer (`nexus_worker_group`)
Consumer memastikan NATS mencatat posisi terakhir pesan yang sukses diproses (*offset management*). Nama consumer ini harus sama dengan `NATS_CONSUMER_NAME` di file `.env`.

```bash
nats consumer add NEXUS_STREAM nexus_worker_group \
  --pull \
  --deliver all \
  --ack explicit \
  --replay instant \
  --filter "NEXUS_STREAM.>"
```

---

## 📡 3. Integrasi dengan Nexus Worker

### Konfigurasi `.env`
Pastikan variabel lingkungan di Nexus Worker sudah sesuai dengan *setup* di atas:

```bash
# NATS URL
NATS_URL=nats://localhost:4222

# Nama Stream (Harus sama dengan langkah 2A)
NATS_STREAM_NAME=NEXUS_STREAM

# Nama Consumer (Harus sama dengan langkah 2B)
NATS_CONSUMER_NAME=nexus_worker_group
```

### Menjalankan Worker
```bash
bun install
bun run dev
```

---

## 🧪 4. Testing & Triggering Jobs

Anda dapat memicu (*trigger*) job menggunakan NATS CLI dengan format subjek:
`NATS_STREAM_NAME`.`JOB_SUBJECT`

### Contoh: Trigger Job Welcome Email
```bash
nats pub NEXUS_STREAM.notification.welcome.send '{"email": "user@example.com", "name": "John Doe"}'
```

### Contoh: Trigger Job Zabbix Sync
```bash
nats pub NEXUS_STREAM.zabbix.sync.iforte.graphs "{}"
```

### Monitoring Pesan
Untuk melihat status stream dan berapa pesan yang sedang mengantre:
```bash
# Melihat statistik stream
nats stream info NEXUS_STREAM

# Melihat statistik consumer
nats consumer info NEXUS_STREAM nexus_worker_group
```
