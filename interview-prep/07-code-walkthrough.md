# 07 — Code Walkthrough (plain English tour of the important files)

Read these files top to bottom before the interview. This section tells you *what each one
does* and *what to notice*.

---

## 1. `backend/src/app.ts` — the Express app

- Creates the app, enables **CORS** and **JSON body parsing**.
- Mounts routers: `/videos`, `/auth`, `/courses`, `/lessons`.
- Has a `/health` endpoint returning `{ status: "ok" }`.

## 2. `backend/src/server.ts` — entry point

- Loads `.env` via `dotenv`, listens on `PORT` (default 4000).

## 3. `backend/src/configs/multer.ts` — file upload

```ts
export const upload = multer({ dest: "uploads/" });
```

- Just saves uploaded files to a temp folder. No size limits or file-type filtering (a
  talking point for 11-improvements).

## 4. `backend/src/controllers/video.controllers.ts` — the core upload/stream logic

Functions:
- `uploadVideo` — the whole upload pipeline (see 03-flow-diagrams). Returns fast.
- `getVideos` — fetches one video, adds a **signed** stream URL if the video has an HLS master key.
- `getVideoStream` — returns the master playlist URL. **Note**: this one builds a plain
  URL (`https://<bucket>.s3.<region>.amazonaws.com/...`), not a signed URL.
- `getAllVideos` — lists all videos newest-first.

Watch-outs worth mentioning:
- The upload controller creates the DB record *before* uploading to S3, so the `videoId`
  is available for the S3 key.
- If anything throws, it returns 500 with "Upload failed" — no retry logic.

## 5. `backend/src/queue/connection.ts` + `video.queue.ts` — the queue

```ts
export const connection = { host: "localhost", port: 6379 };
export const videoQueue = new Queue("video-processing", { connection });
```

- One shared queue named `video-processing`. The API adds jobs; the worker consumes them.

## 6. `backend/src/worker/video.worker.ts` — the transcoder

The heart of the project. Step by step:
1. Get `videoId` from job data.
2. Look up the video in the DB — **throw** if missing (job fails).
3. Update status → `PROCESSING`.
4. `downloadFromS3(originalKey, "<videoId>.mp4")` → temp file.
5. For each of the 3 `HLS_VARIANTS`, run `generateHLSVariant(...)` → creates a folder with
   `.ts` segments + `index.m3u8`.
6. `generateMasterPlaylist(...)` → writes `master.m3u8`.
7. `uploadDirectoryToS3(outputDir, "processed/<videoId>")` → recursive upload to S3.
8. Update DB: `hlsMasterKey`, status → `COMPLETED`.
9. Cleanup: `fs.unlinkSync(localPath)` and `fs.rmSync(outputDir, { recursive: true })`.

Also listens to `completed` and `failed` events and logs them.

## 7. `backend/src/services/generateHLSVariant.ts` — one quality level

- Defines `HLS_VARIANTS` with real numbers:

| name | width x height | video bitrate | audio bitrate | bandwidth |
|------|----------------|---------------|---------------|-----------|
| 360p | 640x360 | 800k | 96k | 896,000 |
| 720p | 1280x720 | 2800k | 128k | 2,928,000 |
| 1080p | 1920x1080 | 5000k | 192k | 5,192,000 |

- `generateHLSVariant` spawns FFmpeg, creates the variant folder, runs the command, resolves
  on exit code 0, rejects otherwise.

## 8. `backend/src/services/generateMasterPlaylist.ts`

- Writes `#EXTM3U`, then one `#EXT-X-STREAM-INF:BANDWIDTH=...,RESOLUTION=...` + variant path
  per quality. Produces `master.m3u8` at the root of the output dir.

## 9. `backend/src/storage/*` — S3 helpers

- `s3.ts` — creates the `S3Client` from env vars.
- `uploadToS3.ts` — streams a local file to S3 (`PutObjectCommand`).
- `downloadFromS3.ts` — `GetObjectCommand`, pipes the stream to a local file.
- `uploadDirectoryToS3.ts` — walks a folder recursively, uploading each file (this is how the
  whole HLS package goes up).
- `getSignedUrl.ts` — returns a presigned URL valid for 1 hour.

## 10. Auth stack

- `src/controllers/auth.controllers.ts` — `registerHandler`, `loginHandler`.
- `src/lib/hash.ts` — `hashPassword`, `checkPassword` (bcrypt).
- `src/lib/token.ts` — access (30m) + refresh (7d) JWT helpers, `AppRole` type.
- `src/middlewares/auth.middleware.ts` — `requireAuth` (verifies Bearer token, loads user),
  `requireRole(...)` (role check).
- `src/schemas/auth.schema.ts` — Zod schemas for register/login.

## 11. Course / Lesson controllers

- `course.controllers.ts` — create/list/get course.
- `lesson.controllers.ts` — create lesson, **upload lesson video** (uses `$transaction` to
  create the Video and link it to the Lesson atomically), get lesson video (returns signed
  URLs per rendition).
- On lesson-video upload error: marks the created video as `FAILED` and cleans up the file.

## 12. Frontend (short tour)

- `pages/Home.tsx` — upload, list, select video, play.
- `api/video.ts` — axios calls: `uploadVideo`, `getAllVideos`, `getVideoStream`.
- `components/VideoPlayer.tsx` — creates an `Hls` instance, `loadSource(streamUrl)`,
  `attachMedia(video)`; destroys on unmount; falls back to native HLS on Safari.
- `components/UploadCard.tsx`, `VideoList.tsx`, `StatusBadge.tsx`, `VideoCard.tsx` — UI.

## "Read this before the interview" shortlist

1. `src/worker/video.worker.ts` — you'll be asked about this most.
2. `src/controllers/video.controllers.ts` — upload + stream logic.
3. `src/services/generateHLSVariant.ts` — FFmpeg command + variants.
4. `src/storage/uploadDirectoryToS3.ts` — recursive HLS upload.
5. `src/middlewares/auth.middleware.ts` — JWT protection.
6. `prisma/schema.prisma` — data model.
