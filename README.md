# LMS Tempat Les — Online Testing API

Backend REST API untuk platform LMS tempat les: guru mengelola bank soal (Pilihan Ganda & Essay), menugaskan ujian ke murid, dan sistem menilai jawaban secara otomatis (auto-grading engine).

Dibangun sesuai spesifikasi pada `DESIGN.md` (FSD v1.1).

## Tech Stack

| Layer | Teknologi |
| :--- | :--- |
| Framework | NestJS 11 (Node.js 20) |
| Database | PostgreSQL |
| ORM | Prisma ORM |
| Auth | JWT (Bearer) + bcrypt, RBAC (`GURU` / `MURID`) |
| Validasi | class-validator + class-transformer |
| Export | ExcelJS (.xlsx) |

## Fitur V1

- **RBAC**: pemisahan hak akses mutlak antara Guru dan Murid.
- **Bank Soal**: soal Pilihan Ganda (kunci dinormalkan ke huruf opsi A–J) dan Essay (kunci kata kunci).
- **Draft & Publish Workflow**: tugas dibuat sebagai draft, baru terlihat murid setelah di-publish.
- **Smart Assignment**: satu penugasan untuk banyak murid sekaligus, dengan durasi pengerjaan & due date.
- **Auto-Grading Engine**: penilaian murni di server.
  - PG: pencocokan huruf opsi (case-insensitive).
  - Essay: exact match ternormalisasi (huruf kecil + spasi berlebih diabaikan); jawaban panjang yang tidak cocok ditandai `NEEDS_REVIEW`.
- **Keamanan Penilaian**: kunci jawaban & pembahasan tidak pernah dikirim saat pengerjaan (`/take`), hanya muncul setelah submit (`/submit` & `/review`).
- **Anti Double Submit**: constraint unik `(assignmentId, studentId)`.
- **Timeout Flag**: penanda `isTimeout` untuk auto-submit ketika waktu habis.
- **Export Rekap Nilai**: unduh rekap nilai dalam format `.xlsx`.

## Setup

```bash
# 1. Install dependencies
$ yarn install

# 2. Konfigurasi environment
$ cp .env.example .env   # lalu sesuaikan DATABASE_URL & JWT_SECRET

# 3. Jalankan migrasi database
$ yarn prisma migrate dev

# 4. Jalankan aplikasi
$ yarn run start:dev
```

Aplikasi berjalan di `http://localhost:3000` dengan global prefix `/api`.

## Environment Variables

| Variable | Deskripsi | Contoh |
| :--- | :--- | :--- |
| `DATABASE_URL` | Koneksi PostgreSQL | `postgresql://user@localhost:5432/lms_online_testing?schema=public` |
| `JWT_SECRET` | Secret untuk signing JWT | (string acak yang kuat) |
| `JWT_EXPIRES_IN` | Masa aktif token | `1d` |
| `PORT` | Port server | `3000` |

## API Endpoints

### Authentication

| Method | Endpoint | Role | Deskripsi |
| :--- | :--- | :--- | :--- |
| POST | `/api/auth/register` | Public | Daftar akun (`role`: `GURU` / `MURID`) |
| POST | `/api/auth/login` | Public | Login, mengembalikan JWT |
| GET | `/api/auth/me` | Semua | Profil user yang sedang login |

### Modul Guru — Bank Soal

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| POST | `/api/questions` | Buat soal PG/Essay |
| GET | `/api/questions` | Daftar bank soal milik guru |
| PUT | `/api/questions/:id` | Ubah soal |
| DELETE | `/api/questions/:id` | Hapus soal |

Contoh body `POST /api/questions`:

```json
{
  "questionText": "Ibu kota Indonesia adalah...",
  "type": "MULTIPLE_CHOICE",
  "options": ["A. Jakarta", "B. Bandung", "C. Surabaya"],
  "correctAnswer": "A",
  "explanation": "Ibu kota Indonesia adalah Jakarta."
}
```

> Untuk PG, `correctAnswer` menerima huruf opsi (`"A"`) atau teks opsi lengkap (`"A. Jakarta"`) — keduanya dinormalkan menjadi huruf opsi.

### Modul Guru — Penugasan

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| POST | `/api/assignments` | Tugaskan paket soal ke banyak murid (draft) |
| GET | `/api/assignments/teacher` | Daftar tugas + rekap nilai murid |
| PATCH | `/api/assignments/:id/publish` | Publikasikan tugas |
| GET | `/api/assignments/:id/export` | Unduh rekap nilai `.xlsx` |

```json
{
  "title": "Ujian Geografi Kelas 8",
  "questionIds": ["<questionId1>", "<questionId2>"],
  "studentIds": ["<studentId1>", "<studentId2>"],
  "durationMin": 45,
  "dueDate": "2026-12-31T23:59:00Z"
}
```

### Modul Murid — Pengerjaan

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| GET | `/api/assignments/student` | Daftar tugas milik murid |
| GET | `/api/assignments/:id/take` | Ambil soal tanpa kunci jawaban (+ `serverTime` untuk timer) |
| POST | `/api/assignments/:id/submit` | Kirim jawaban → skor otomatis + review |
| GET | `/api/assignments/:id/review` | Detail jawaban vs kunci + pembahasan |

```json
{
  "answers": { "<questionId>": "A", "<essayQuestionId>": "Jakarta" },
  "isTimeout": false
}
```

Response submit:

```json
{
  "message": "Tugas berhasil dikumpulkan",
  "submissionId": "...",
  "score": 50,
  "status": "AUTO_GRADED",
  "summary": { "totalQuestions": 2, "correct": 1, "wrong": 1 },
  "review": [
    {
      "questionId": "...",
      "questionType": "MULTIPLE_CHOICE",
      "questionText": "Ibu kota Indonesia adalah...",
      "studentAnswer": "A",
      "correctAnswer": "A",
      "isCorrect": true,
      "explanation": "Ibu kota Indonesia adalah Jakarta."
    }
  ]
}
```

## Struktur Proyek

```
src/
├── common/            # Guards (JWT, Roles) & decorators (@Public, @Roles, @CurrentUser)
├── auth/              # Register, login, me, JWT strategy
├── questions/         # CRUD bank soal (validasi kunci jawaban PG)
├── assignments/       # Penugasan, take, submit, review, publish, export
│   └── grading.ts     # Auto-grading engine (pure function)
└── prisma/            # Prisma service (global)
```

## Testing

```bash
# unit tests (grading engine, auth, questions, assignments)
$ yarn test

# e2e tests
$ yarn test:e2e

# coverage
$ yarn test:cov
```
