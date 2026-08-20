# 06 — Key Concepts (explained simply)

Junior interviewers probe your understanding of the *concepts*, not just the code.
Here's each concept explained the way you'd explain it out loud.

---

## 1. HLS (HTTP Live Streaming)

**In one sentence**: HLS chops a video into small 6-second `.ts` segments and creates playlist
files (`.m3u8`) that tell the player which segments to download next.

Why it matters here:
- The video is **not** served as one big file. It's served as many tiny chunks.
- The player (HLS.js) reads the playlist and fetches segments in order, so streaming starts fast.
- Supports **adaptive bitrate** (see below).

Two kinds of playlists:
- **Variant playlist** (e.g. `360p/index.m3u8`): the actual segments for one quality.
- **Master playlist** (`master.m3u8`): a list pointing to the variant playlists, with bandwidth/resolution info so the player can choose.

## 2. Adaptive Bitrate Streaming (ABR)

**In one sentence**: the player switches between 360p/720p/1080p automatically based on your
internet speed.

- Each variant has a `BANDWIDTH` value in the master playlist.
- HLS.js measures the current network throughput and picks the highest quality that won't buffer.
- Slow network → drops to 360p. Fast network → bumps to 1080p.

## 3. FFmpeg

**In one sentence**: a command-line tool for processing video/audio; we use it to convert one
video into multiple resolutions.

Command in this project (simplified):

```bash
ffmpeg -i input.mp4 -vf scale=w=-2:h=720:force_original_aspect_ratio=decrease \
  -c:v libx264 -c:a aac -b:v 2800k -b:a 128k \
  -hls_time 6 -hls_playlist_type vod \
  -hls_segment_filename '720p/720p_%03d.ts' 720p/index.m3u8
```

Key flags:
- `-i` input file
- `-vf scale=...` resize (height fixed, width auto, aspect ratio kept, divisible by 2)
- `-c:v libx264` H.264 video codec (plays everywhere)
- `-c:a aac` AAC audio codec
- `-b:v / -b:a` target bitrates
- `-hls_time 6` 6-second segments
- `-hls_playlist_type vod` "video on demand" playlist (not a live stream)
- `-hls_segment_filename` where to write the `.ts` chunks

## 4. BullMQ + Redis

**In one sentence**: BullMQ is a job-queue library that uses Redis to reliably pass jobs
between producers (the API) and consumers (the worker).

- **Queue** = a named list of pending jobs (`video-processing`).
- **Producer** = API server: `videoQueue.add("transcode-video", { videoId })`.
- **Consumer** = worker: `new Worker("video-processing", handler)`.
- Redis is the storage behind the queue (a fast in-memory data store).
- Benefits: jobs survive restarts, retries possible, workers can scale horizontally.

## 5. AWS S3

**In one sentence**: object storage in the cloud — like a giant file system with keys.

- Keys look like folders: `raw/<videoId>/original.mp4`.
- Storing videos in S3 keeps the API server **stateless** (no local disk growth).
- `PutObject` uploads, `GetObject` downloads, presigned URLs give temporary access.

## 6. Multer

**In one sentence**: Express middleware that parses `multipart/form-data` (file uploads).

- `upload.single("video")` takes one file from the `video` field.
- Saves it to a temp folder (`uploads/`) before we re-upload it to S3.
- We delete the temp file after upload (cleanup).

## 7. Prisma

**In one sentence**: a TypeScript ORM — maps your database tables to typed objects.

- Schema in `schema.prisma` → migrations generate SQL.
- Queries are typed: `prisma.video.findUnique(...)`.
- Supports transactions (`$transaction`).

## 8. Node.js child_process (spawn)

**In one sentence**: FFmpeg is a separate program, and Node talks to it by launching it as a
child process.

- `spawn("ffmpeg", [...args])` runs FFmpeg without blocking Node's event loop.
- We `await` a promise that resolves when FFmpeg exits with code 0.
- FFmpeg logs go to `stderr`, which we print to console.

## 9. JWT (JSON Web Token)

**In one sentence**: a signed token that proves who you are; the server doesn't need to look
you up for every request.

- **Access token** (30 min): sent in `Authorization: Bearer ...`, verified by `requireAuth`.
- **Refresh token** (7 days): stored in an httpOnly cookie, used to get a new access token.
- Payload: `{ sub: userId, role }`. Signed with a secret so it can't be forged.

## 10. bcrypt

**In one sentence**: hashes passwords so we never store plain text.

- `genSalt(10)` + `hash(password, salt)` → hash stored in DB.
- On login, `compare(password, hash)` checks without revealing the hash.
- Salt prevents identical passwords from producing identical hashes.

## 11. Zod

**In one sentence**: schema validation for request bodies.

- `registerSchema.safeParse(req.body)` → either valid data or error details.
- Protects the API from malformed/malicious input before hitting the DB.

## 12. HTTP status codes used

- **200** success, **201** created
- **400** bad request (missing/invalid data)
- **401** unauthorized (not logged in / bad token)
- **403** forbidden (wrong role / not the owner)
- **404** not found
- **409** conflict (duplicate email, lesson order, video already exists)
- **500** internal server error

## 13. Async / non-blocking

**In one sentence**: Node handles many requests at once on one thread by not blocking on slow
operations (I/O, DB, S3) — it uses promises/callbacks.

But CPU-heavy work (like FFmpeg) blocks the event loop, which is *exactly why* transcoding is
moved to a separate worker process.
