# VideoFlow

A scalable backend service for video uploading, transcoding, and cloud storage built with **Node.js**, **Express**, **TypeScript**, **BullMQ**, **Redis**, **AWS S3**, **FFmpeg**, and **PostgreSQL**.

VideoFlow processes uploaded videos asynchronously using a worker-based architecture, generates multiple resolutions, stores the processed videos in Amazon S3, and tracks every job throughout its lifecycle.

---

## Features

- 🔐 JWT Authentication
- 📤 Secure video upload
- ☁️ AWS S3 object storage
- 🎬 FFmpeg video transcoding
- 📺 Multi-resolution output
  - 360p
  - 720p
  - 1080p
- ⚡ Background processing using BullMQ
- 📦 Redis-backed job queue
- 👷 Dedicated worker service
- 🗄 PostgreSQL database with Prisma ORM
- 📈 Video processing status tracking
- 🧹 Automatic temporary file cleanup
- 📝 RESTful API

---

# Architecture

```
                Client
                   │
                   ▼
        ┌────────────────────┐
        │   Express Backend   │
        └────────────────────┘
            │            │
            │            │
            ▼            ▼
        PostgreSQL     AWS S3
            │
            │
            ▼
     BullMQ Queue (Redis)
            │
            ▼
      Worker Service
            │
            ▼
         FFmpeg
            │
            ▼
      Generate Renditions
            │
            ▼
        Upload to S3
            │
            ▼
      Update Database
```

---

# Tech Stack

## Backend

- Node.js
- Express.js
- TypeScript

## Database

- PostgreSQL
- Prisma ORM

## Queue

- Redis
- BullMQ

## Cloud

- AWS S3

## Video Processing

- FFmpeg

## Authentication

- JWT
- bcrypt

---

# Project Structure

```
src
├── config
├── controllers
├── middleware
├── routes
├── services
├── queues
├── workers
├── utils
├── prisma
└── server.ts
```

---

# Video Processing Flow

1. User uploads a video.
2. Backend validates the request.
3. Original video is uploaded to AWS S3.
4. A BullMQ job is created.
5. Worker consumes the job.
6. Worker downloads the video from S3.
7. FFmpeg generates multiple resolutions.
8. Generated videos are uploaded back to S3.
9. Database is updated with rendition information.
10. Temporary files are removed.

---

# Processing Pipeline

```
Upload
   │
   ▼
AWS S3
   │
   ▼
BullMQ Queue
   │
   ▼
Worker
   │
   ▼
Download
   │
   ▼
FFmpeg
   │
   ▼
360p
720p
1080p
   │
   ▼
Upload to S3
   │
   ▼
Update Database
```

---

# Job Status

Every video goes through the following states:

```
QUEUED
    │
    ▼
PROCESSING
    │
    ▼
COMPLETED
```

If processing fails:

```
QUEUED
    │
    ▼
PROCESSING
    │
    ▼
FAILED
```

---

# API Overview

## Authentication

```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

## Video

```
POST /api/videos/upload
GET  /api/videos
GET  /api/videos/:id
DELETE /api/videos/:id
```

> Endpoints may differ depending on the current implementation.

---

# Environment Variables

Create a `.env` file.

```env
DATABASE_URL=

JWT_SECRET=

REDIS_HOST=
REDIS_PORT=

AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=

PORT=5000
```

---

# Installation

Clone the repository

```bash
git clone https://github.com/priyabr4t/Video-Flow.git
```

Install dependencies

```bash
npm install
```

Generate Prisma Client

```bash
npx prisma generate
```

Run migrations

```bash
npx prisma migrate dev
```

Start Redis

```bash
redis-server
```

Run Backend

```bash
npm run dev
```

Run Worker

```bash
npm run worker
```

---

# Future Improvements

- HLS Streaming
- Adaptive Bitrate Streaming
- Video Thumbnails
- WebSocket Progress Updates
- Signed Download URLs
- Retry Mechanism
- Queue Dashboard
- Docker Compose
- Health Checks
- Metrics
- Rate Limiting
- API Documentation with Swagger
- CI/CD Pipeline

---

# Why VideoFlow?

Modern video platforms process media asynchronously rather than blocking user requests. VideoFlow follows the same architectural approach by separating the API server from background workers, enabling scalable and reliable video processing.

---

# License

MIT


I would also recommend adding a few screenshots later (Swagger UI, S3 bucket structure, architecture diagram, and database schema). Those visual elements make the repository feel much more polished to recruiters.
