# 02 — Architecture

## Big picture (draw this on a whiteboard)

```text
        ┌──────────────┐
        │ React Front  │   upload video, list videos, play HLS
        │ end (Vite)   │
        └──────┬───────┘
               │ HTTP (Axios)
               ▼
        ┌──────────────┐
        │ Express API  │   multer (file) + JWT (auth) + controllers
        └──┬───────┬───┘
           │       │
           │       └───────────► PostgreSQL (Prisma)
           │                        Video metadata + status
           ▼
     AWS S3 (raw videos)
           │
           ▼
     BullMQ Queue (Redis)
           │
           ▼
     Worker process (separate)
           │
           ▼
     FFmpeg ──► 360p, 720p, 1080p HLS renditions
           │
           ├──► master.m3u8
           ▼
     Upload HLS package to S3 (processed)
           │
           ▼
     Update status in PostgreSQL (COMPLETED)
           │
           ▼
     Frontend streams via HLS.js (signed/plain S3 URL)
```

## Components explained simply

### 1. Frontend (React + Vite + HLS.js)
- Uploads a file via `POST /videos/upload`.
- Lists videos via `GET /videos`.
- Gets a stream URL via `GET /videos/:id/stream`.
- Plays it with `Hls.js` (falls back to native playback on Safari).

### 2. Express API server
- Runs on port 4000.
- Uses **multer** to accept file uploads (`uploads/` folder on disk).
- Uses **Prisma** to talk to PostgreSQL.
- Uses **BullMQ Queue** to add jobs.
- Also serves auth (register/login), courses, and lessons routes.

### 3. PostgreSQL + Prisma
- Stores video records: `id`, `status`, `originalKey`, `hlsMasterKey`, timestamps.
- Status is the source of truth for "is this video ready?".

### 4. Redis
- Backs the BullMQ queue. Holds pending jobs. Also stores job state (waiting, active, completed, failed).

### 5. BullMQ
- Queue name: `video-processing`.
- API server is the **producer** (adds jobs).
- Worker is the **consumer** (processes jobs).
- Job data: `{ videoId }`.

### 6. Worker process
- Started separately with `npm run worker`.
- On each job: download raw video from S3 → transcode with FFmpeg → build HLS package → upload to S3 → update DB → clean temp files.

### 7. FFmpeg
- A CLI tool invoked from Node via `child_process.spawn`.
- Generates one HLS variant per resolution.
- Each variant produces a folder with `.ts` segments + an `index.m3u8` playlist.
- A master playlist (`master.m3u8`) links all variants together.

### 8. AWS S3
- `raw/<videoId>/original.mp4` — the uploaded original.
- `processed/<videoId>/<360p|720p|1080p>/...` + `master.m3u8` — the HLS package.

## Why this split (API vs Worker)?

- **Separation of concerns**: request handling is fast; transcoding is slow.
- **Scalability**: you can scale workers horizontally without touching the API.
- **Resilience**: if a worker crashes mid-job, the job stays in Redis and can be retried.
- **Responsiveness**: the upload response returns in milliseconds, not minutes.

## Directory mapping (backend)

| Concern | Where it lives |
|---------|----------------|
| HTTP app + routes | `src/app.ts`, `src/routes/*` |
| Request handlers | `src/controllers/*` |
| Upload parsing | `src/configs/multer.ts` |
| Queue producer | `src/queue/video.queue.ts` |
| Redis connection | `src/queue/connection.ts` |
| Worker consumer | `src/worker/video.worker.ts` |
| FFmpeg transcoding | `src/services/*` |
| S3 operations | `src/storage/*` |
| Auth | `src/middlewares/auth.middleware.ts`, `src/lib/token.ts`, `src/controllers/auth.controllers.ts` |

## Authentication (brief)

- **Register**: validates with Zod, hashes password with bcrypt, saves user.
- **Login**: verifies password, returns a JWT **access token** (30 min) and sets an httpOnly **refresh token cookie** (7 days).
- **Middleware**: `requireAuth` checks the `Authorization: Bearer <token>` header; `requireRole` checks the user's role (STUDENT / INSTRUCTOR / ADMIN).
- Courses/lessons routes use these guards (e.g., only the course owner or an admin can add a lesson).
