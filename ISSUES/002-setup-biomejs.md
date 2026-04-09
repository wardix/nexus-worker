# Issue: Setup BiomeJS for Code Formatting and Linting

## 📝 Deskripsi
Saat ini proyek `nexus-worker` belum memiliki standar *formatting* dan *linting* yang seragam. Kita akan menggunakan **BiomeJS** (sebelumnya Rome) sebagai alat yang sangat cepat untuk menangani *formatting* dan *linting* pada proyek ini.

## 🎯 Tujuan
- Menginstal BiomeJS sebagai *dev dependency*.
- Mengonfigurasi BiomeJS dengan aturan *formatting* spesifik.
- Menambahkan *scripts* di `package.json` untuk menjalankan BiomeJS.

---

## 🛠 Langkah-Langkah Implementasi (Instruksi untuk AI / Developer)

### 1. Instalasi BiomeJS
Jalankan perintah berikut menggunakan **Bun** untuk menginstal BiomeJS sebagai dependensi pengembangan:
```bash
bun add -d @biomejs/biome
```

### 2. Inisialisasi Konfigurasi
Jalankan perintah inisialisasi untuk membuat file `biome.json`:
```bash
bunx @biomejs/biome init
```

### 3. Perbarui Konfigurasi (`biome.json`)
Buka file `biome.json` yang baru saja dibuat dan ubah bagian `formatter` dan `javascript.formatter` (atau buat jika belum ada) agar sesuai dengan ketentuan berikut:
- **Indent Style**: spasi (`space`)
- **Quote Style**: kutipan tunggal (`single`)
- **Semicolons**: hanya jika diperlukan (`asNeeded`)

**Contoh `biome.json` yang diharapkan:**
```json
{
  "$schema": "https://biomejs.dev/schemas/1.8.3/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineEnding": "lf",
    "lineWidth": 80,
    "attributePosition": "auto"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "asNeeded",
      "arrowParentheses": "always",
      "bracketSpacing": true,
      "bracketSameLine": false,
      "quoteProperties": "asNeeded",
      "trailingCommas": "all"
    }
  }
}
```

### 4. Tambahkan NPM Scripts (`package.json`)
Tambahkan perintah berikut ke bagian `scripts` di `package.json` agar mudah dijalankan:
```json
  "scripts": {
    // ... script lainnya
    "format": "biome format --write .",
    "lint": "biome lint .",
    "check": "biome check --write ."
  }
```

### 5. Format Ulang Semua Kode
Setelah konfigurasi selesai, jalankan perintah berikut untuk memformat semua kode yang ada agar sesuai dengan aturan baru:
```bash
bun run check
```

---

## ✅ Kriteria Penerimaan (Definition of Done)
1. Paket `@biomejs/biome` terinstal di `package.json` bagian `devDependencies`.
2. File `biome.json` ada di *root* proyek dan berisi konfigurasi `indentStyle: "space"`, `quoteStyle: "single"`, dan `semicolons: "asNeeded"`.
3. Script `format`, `lint`, dan `check` tersedia di `package.json`.
4. Menjalankan `bun run format` tidak menghasilkan error.
