# VideoFlow

A scalable video transcoding and adaptive streaming service built with **Node.js**, **Express**, **TypeScript**, **BullMQ**, **Redis**, **AWS S3**, **FFmpeg**, **PostgreSQL**, and **React**.

VideoFlow processes uploaded videos asynchronously using a dedicated worker architecture. Uploaded videos are stored in Amazon S3, transcoded into adaptive HLS streams using FFmpeg, uploaded back to S3, and served to clients through HLS streaming.

---

# Features

- Secure video upload
- Asynchronous background processing with BullMQ
- Redis-backed job queue
- Dedicated worker service
- FFmpeg-powered HLS transcoding
- Adaptive bitrate streaming
  - 360p
  - 720p
  - 1080p
- Automatic HLS master playlist generation
- AWS S3 object storage
- Recursive HLS package upload
- PostgreSQL database with Prisma ORM
- Video processing status tracking
- Automatic temporary file cleanup
- React frontend with HLS.js playback
- RESTful API

---

# Architecture

```text
                    React Frontend
                           │
                    Upload / Stream
                           │
                           ▼
                 ┌──────────────────┐
                 │ Express Backend  │
                 └──────────────────┘
                     │         │
                     │         ▼
                     │   PostgreSQL
                     │
                     ▼
               AWS S3 (Raw Videos)
                     │
                     ▼
              BullMQ Queue (Redis)
                     │
                     ▼
              Background Worker
                     │
                     ▼
                   FFmpeg
                     │
      ┌──────────────┼──────────────┐
      ▼              ▼              ▼
    360p           720p          1080p
      └──────────────┼──────────────┘
                     ▼
             master.m3u8 generated
                     ▼
          Upload HLS Package to S3
                     ▼
          AWS S3 (Processed Videos)
                     ▼
               React + HLS.js
```

---

# Tech Stack

## Backend

- Node.js
- Express.js
- TypeScript

## Frontend

- React
- Vite
- Tailwind CSS
- Axios
- HLS.js

## Database

- PostgreSQL
- Prisma ORM

## Queue

- Redis
- BullMQ

## Cloud Storage

- AWS S3

## Video Processing

- FFmpeg
- HLS (HTTP Live Streaming)

---

# Project Structure

```text
backend
├── prisma
├── src
│   ├── configs
│   ├── controllers
│   ├── lib
│   ├── middleware
│   ├── queue
│   ├── routes
│   ├── services
│   ├── storage
│   ├── worker
│   └── server.ts
│
frontend
├── src
│   ├── api
│   ├── components
│   ├── pages
│   ├── types
│   └── App.tsx
```

---

# Video Processing Flow

1. User uploads a video.
2. Backend validates the request.
3. Original video is uploaded to Amazon S3.
4. A BullMQ job is created.
5. Worker consumes the job.
6. Worker downloads the original video from S3.
7. FFmpeg generates HLS renditions.
8. A master playlist (`master.m3u8`) is generated.
9. The complete HLS package is uploaded back to Amazon S3.
10. Database status is updated.
11. Temporary files are removed.
12. The video becomes available for streaming.

---

# Processing Pipeline

```text
Upload Video
      │
      ▼
Store Original Video in S3
      │
      ▼
Create BullMQ Job
      │
      ▼
Worker Picks Job
      │
      ▼
Download Original Video
      │
      ▼
FFmpeg Transcoding
      │
      ▼
Generate

├── master.m3u8
├── 360p/
├── 720p/
└── 1080p/

      │
      ▼
Upload HLS Package to S3
      │
      ▼
Update Database
      │
      ▼
Ready to Stream
```

---

# Job Lifecycle

Every uploaded video progresses through the following states.

```text
QUEUED
     │
     ▼
PROCESSING
     │
     ├──────────────► FAILED
     │
     ▼
COMPLETED
```

---

# API Reference

Base URL

```http
http://localhost:4000/api
```

---

## Upload Video

Uploads a video, stores the original file in Amazon S3, creates a processing job, and immediately returns the generated video ID.

### Endpoint

```http
POST /videos/upload
```

### Request

**Content-Type**

```text
multipart/form-data
```

| Field | Type | Required | Description |
|--------|------|----------|-------------|
| video | File | Yes | Video file |

### Success Response

```json
{
  "success": true,
  "videoId": "cmr8ahu9o000089yc0bka73ku"
}
```

### Workflow

```text
Receive File
      │
      ▼
Upload Original Video to S3
      │
      ▼
Create Database Record
      │
      ▼
Queue BullMQ Job
      │
      ▼
Return Response
```

---

## List Videos

Returns all uploaded videos ordered by creation time.

### Endpoint

```http
GET /videos
```

### Success Response

```json
[
  {
    "id": "cmr8ahu9o000089yc0bka73ku",
    "status": "COMPLETED",
    "hlsMasterKey": "processed/cmr8ahu9o000089yc0bka73ku/master.m3u8",
    "createdAt": "2026-07-06T11:20:13.456Z"
  }
]
```

---

## Get Video Details

Returns metadata for a specific video.

### Endpoint

```http
GET /videos/:id
```

### Path Parameters

| Parameter | Description |
|-----------|-------------|
| id | Video ID |

### Success Response

```json
{
  "id": "cmr8ahu9o000089yc0bka73ku",
  "status": "COMPLETED",
  "hlsMasterKey": "processed/cmr8ahu9o000089yc0bka73ku/master.m3u8",
  "createdAt": "2026-07-06T11:20:13.456Z",
  "updatedAt": "2026-07-06T11:25:44.193Z"
}
```

---

## Get Stream URL

Returns the HLS master playlist URL for a processed video.

### Endpoint

```http
GET /videos/:id/stream
```

### Success Response

```json
{
  "streamUrl": "https://your-bucket.s3.ap-south-1.amazonaws.com/processed/cmr8ahu9o000089yc0bka73ku/master.m3u8"
}
```

### Processing Logic

```text
Find Video
      │
      ▼
Verify Video Exists
      │
      ▼
Check Status == COMPLETED
      │
      ▼
Return HLS Master Playlist URL
```

### Possible Responses

#### 400

```json
{
  "message": "Video is still processing"
}
```

#### 404

```json
{
  "message": "Video not found"
}
```

#### 404

```json
{
  "message": "Stream not found"
}
```

---

# Database Schema

## Video

| Field | Type | Description |
|--------|------|-------------|
| id | String | Primary key |
| originalKey | String | Original video location in S3 |
| hlsMasterKey | String | Master playlist location |
| status | VideoStatus | Current processing state |
| createdAt | DateTime | Upload timestamp |
| updatedAt | DateTime | Last updated timestamp |

---

# Environment Variables

Create a `.env` file.

```env
PORT=4000

DATABASE_URL=

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
S3_BUCKET_NAME=

REDIS_HOST=
REDIS_PORT=

JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
```

---

# Installation

Clone the repository.

```bash
git clone https://github.com/priyabr4t/VideoFlow.git
```

Install dependencies.

```bash
npm install
```

Generate Prisma Client.

```bash
npx prisma generate
```

Run database migrations.

```bash
npx prisma migrate dev
```

Start Redis.

```bash
redis-server
```

Start the backend.

```bash
npm run dev
```

Start the worker.

```bash
npm run worker
```

Start the frontend.

```bash
npm run dev
```

---

# Future Improvements

- Docker Compose
- CloudFront CDN
- Signed URLs / Signed Cookies
- Video thumbnail generation
- Video metadata extraction
- Queue monitoring dashboard
- WebSocket processing updates
- Retry failed jobs
- API documentation with Swagger
- CI/CD pipeline
- Kubernetes deployment

---

# Design Decisions

## Why BullMQ?

Video transcoding is a CPU-intensive task that can take several minutes. Instead of blocking the upload request, VideoFlow queues the job and processes it asynchronously using background workers.

## Why AWS S3?

Original videos and processed HLS assets are stored in object storage, allowing the application servers to remain stateless and scalable.

## Why HLS?

Rather than serving a single MP4 file, HLS generates multiple quality levels and allows adaptive bitrate streaming based on the user's network conditions.

## Why a Dedicated Worker?

Separating the API server from the transcoding worker keeps upload requests responsive while heavy processing is handled independently.


---

# License

MIT