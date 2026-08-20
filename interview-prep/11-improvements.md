# 11 — Improvements + Weaknesses

Interviewers ask: *"What would you do differently?"* or *"What would you improve?"* Here's a
concise, ranked list plus honest weakness answers.

---

## Improvements, ranked by impact

### 1. Fix worker failure handling (critical)
**Problem**: If the worker throws, DB status stays `PROCESSING` forever; the UI never shows `FAILED`.
**Fix**: Wrap the worker body in try/catch → update status to `FAILED` (with error field),
configure BullMQ retries with backoff, and mark `FAILED` only after the final attempt.

### 2. Signed / protected stream URLs
**Problem**: `GET /videos/:id/stream` returns a plain public S3 URL.
**Fix**: Use the existing `getS3SignedUrl` helper (1-hour presigned URL) or CloudFront with
signed cookies/URLs so access is authorized and temporary.

### 3. Upload validation & size limits
**Problem**: Multer has no file-type filter or size limit; a 10 GB file or non-video file is accepted.
**Fix**: `limits: { fileSize }`, a fileFilter (mime type / extension), and error handling
returning 400/413.

### 4. Real-time status updates
**Problem**: Frontend must be manually refreshed; no progress shown.
**Fix**: SSE or WebSocket pushed from the worker, or simple polling of `GET /videos`.

### 5. Refresh token endpoint
**Problem**: Refresh cookie is set but there's no `/auth/refresh` endpoint, so sessions end
after 30 minutes.
**Fix**: Add refresh logic (verify cookie → issue new access token → rotate refresh token),
plus logout and token revocation (denylist) for security.

### 6. Video thumbnails & metadata
**Fix**: Add an FFmpeg frame-extraction step in the worker, store the thumbnail key on the
Video row, display it in the list. Extract duration/size/resolution via `ffprobe`.

### 7. Docker + managed services
**Fix**: `docker-compose.yml` for postgres, redis, api, worker, frontend. Use hosted
Postgres/Redis (RDS/ElastiCache) and managed S3 bucket policies for production readiness.

### 8. CDN in front of S3
**Fix**: CloudFront distribution on the S3 bucket for lower latency and cheaper transfer —
the standard way to serve HLS to the world.

### 9. Worker concurrency & tuning
**Fix**: Set a sensible concurrency per worker (BullMQ `concurrency` option), consider
processing the 3 renditions with limited parallelism, and add queue monitoring (Bull Board)
to observe jobs.

### 10. Testing
**Problem**: No automated tests.
**Fix**: Unit tests for services (master playlist generation, S3 helpers), integration tests
for the upload flow (mock S3/Redis), and contract tests for the API.

### 11. CI/CD + observability
**Fix**: GitHub Actions lint/typecheck/test on push; structured logging (pino), and health
checks that include Redis/DB/S3 connectivity.

---

## Honest "weaknesses" answers

Frame these as "what I'd learn/fix next," not as failures.

- **"No tests yet."**
  > "I focused on getting the end-to-end pipeline working first. Testing is the next thing I
  > want to add — especially for the FFmpeg services and the upload flow."

- **"Failure states aren't fully handled."**
  > "The queue is reliable, but if a job fails the video status can stay `PROCESSING`. I know
  > exactly where and how to fix it (try/catch + status update + retries), and it's my top
  > improvement."

- **"Sequential transcoding is slow."**
  > "I transcode the three renditions one at a time to keep CPU predictable. For throughput
  > I'd parallelize or use a single multi-rendition FFmpeg invocation."

- **"Plain S3 stream URLs."**
  > "I have a presigned-URL helper already, but the stream endpoint uses a public URL. Making
  > it signed (and adding CloudFront) is on my list."

---

## Template answer: "What would you improve?"

> "The pipeline works end-to-end, but I'd harden it. The biggest gap is failure handling —
> when a job fails the video can get stuck as `PROCESSING`, so I'd add retries with backoff
> and mark videos `FAILED` properly. I'd also sign the stream URLs, add upload validation,
> thumbnails, and real-time status updates with SSE or WebSocket. On the infrastructure side,
> Docker Compose, a CDN, and a CI pipeline would make it production-ready."
