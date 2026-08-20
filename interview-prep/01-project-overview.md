# 01 — Project Overview

## What is VideoFlow?

VideoFlow is a **video transcoding and adaptive streaming service**. Users upload a video,
and the system processes it **asynchronously in the background** — it doesn't wait for
transcoding to finish. Instead:

1. The upload request is handled fast and returns immediately.
2. A background **worker** picks up the job, transcodes the video into **3 quality levels** (360p, 720p, 1080p), and creates an HLS package.
3. The video becomes streamable from the frontend using **HLS.js**.

Think of it like a mini **YouTube upload pipeline** — the video is not instantly ready, but
the user is told "uploaded" right away, and it appears when processing is done.

## Core idea: async video processing

Transcoding is slow (CPU-heavy, can take minutes). If the server did it inside the upload
request, the request would hang for minutes. So VideoFlow:

- Handles the upload fast.
- Pushes a **job** onto a queue (BullMQ / Redis).
- Lets a **separate worker process** do the heavy work.
- Tracks progress in the database via a **status field** (QUEUED → PROCESSING → COMPLETED/FAILED).

This is the classic **producer-consumer** pattern.

## Why this problem exists

Modern video platforms must handle uploads quickly while transcoding to adaptive formats takes
minutes. Synchronous processing would block the API, giving users a spinning loader for
extended periods and tying up server resources. VideoFlow solves this by decoupling upload
from processing, ensuring a responsive upload experience while transcoding happens in the background.

## Features

- Secure video upload (multer + S3)
- Asynchronous background processing with **BullMQ**
- **Redis**-backed job queue
- Dedicated **worker service** (runs separately from the API)
- **FFmpeg**-powered **HLS** transcoding
- **Adaptive bitrate streaming**: 360p, 720p, 1080p
- Automatic **master playlist** generation (`master.m3u8`)
- **AWS S3** object storage (original + processed videos)
- Recursive HLS package upload to S3
- **PostgreSQL** database with **Prisma** ORM
- Video processing **status tracking**
- Automatic **temporary file cleanup**
- **React** frontend with HLS.js playback
- RESTful API
- Bonus modules: **JWT auth** (register/login), **courses** and **lessons** that link to videos

## Tech stack

| Layer | Technology | Why it's used |
|-------|-----------|---------------|
| Backend | Node.js + Express 5 + TypeScript | Simple, fast HTTP API; TypeScript gives types |
| Upload handling | Multer | Parses `multipart/form-data` and saves file to disk |
| Queue | BullMQ + Redis | Reliable background job queue that survives restarts |
| Transcoding | FFmpeg (child process) | Converts video to HLS renditions |
| Object storage | AWS S3 (AWS SDK v3) | Stores raw + processed videos; keeps API stateless |
| Database | PostgreSQL + Prisma | Stores video metadata and status with typed queries |
| Auth | JWT (jsonwebtoken) + bcryptjs | Access + refresh tokens, hashed passwords |
| Validation | Zod | Validates request bodies at the API edge |
| Frontend | React 19 + Vite + Tailwind 4 | Upload, list, and play videos |
| Playback | HLS.js | Plays HLS streams in the browser |
| HTTP client | Axios | Calls the backend API |

## Project structure

```
backend/
├── prisma/schema.prisma        # database schema
├── src/
│   ├── app.ts                  # express app + routes
│   ├── server.ts               # entry point
│   ├── configs/multer.ts       # file upload config
│   ├── controllers/            # request handlers
│   ├── lib/                    # prisma client, hashing, jwt
│   ├── middleware/             # auth middleware
│   ├── queue/                  # BullMQ queue + Redis connection
│   ├── routes/                 # route definitions
│   ├── schemas/                # zod schemas
│   ├── scripts/                # test scripts
│   ├── services/               # FFmpeg / HLS generation
│   ├── storage/                # S3 upload/download/sign helpers
│   ├── types/
│   └── worker/video.worker.ts  # background worker
frontend/
└── src/
    ├── api/                    # axios calls
    ├── components/             # UI components
    ├── pages/Home.tsx          # main page
    └── App.tsx
```

Key point: the **API server and the worker are separate processes** started
separately. That separation is the whole point — heavy work never blocks requests.

## Environment variables (don't read these out loud, just know them)

```
PORT=4000
DATABASE_URL=            # PostgreSQL
AWS_ACCESS_KEY_ID=       # S3 credentials
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
S3_BUCKET_NAME=
REDIS_HOST=
REDIS_PORT=
JWT_ACCESS_SECRET=       # 30 min expiry
JWT_REFRESH_SECRET=      # 7 day expiry
```

## "My role" story (30 seconds)

> "I built VideoFlow end-to-end. It's a video transcoding service. I designed the
> asynchronous pipeline — the API receives uploads, stores them in S3, and pushes a job to
> a BullMQ queue. A separate worker transcodes each video into three HLS renditions using
> FFmpeg, generates a master playlist, uploads everything back to S3, and updates the
> status in PostgreSQL. The frontend lists videos and plays them with HLS.js. I also added
> JWT-based auth and a course/lesson structure so videos belong to lessons."

## Problem it solves & design decisions

> **Problem**: Video transcoding is CPU-intensive and can take minutes. Processing it
> synchronously would block the upload request, providing poor UX and tying up server
> resources.

> **Why async + queue**: The API returns immediately after storing the video in S3 and
> queuing a job. A separate worker process consumes jobs from BullMQ, transcodes the video
> with FFmpeg, uploads the HLS package to S3, and updates the video status. This producer‑
> consumer pattern ensures the upload always feels instant while transcoding happens in
> parallel.

> **Alternative considered**: Inline transcoding with `child_process.spawn` in the API route.
> Pros: simpler setup, no extra moving parts. Cons: upload requests block for minutes,
> no scalability, a single transcoding crash takes down the API. Rejected for production use.

> **How failure is handled**: If the worker throws, the job is marked `failed` in Redis.
> The video status is updated to `FAILED` in PostgreSQL (with retries and backoff), and
> the frontend can display an error. A reconciliation job can re-queue stuck videos.

> **Scalability**: The queue + worker model scales horizontally — add more worker instances
> and BullMQ coordinates them via Redis. The API is stateless and can be replicated behind a
> load balancer. For 10×/100× traffic, I'd run more workers, use a hosted Redis service
> (ElastiCache), and add a CDN (CloudFront) in front of S3.
