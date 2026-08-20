# 10 — Cross Questions (follow-up / chained questions)

Interviewers love follow-ups. Each section starts with a scenario, then the questions they'd
chain, then a good answer. These are based on **actual weak spots** in the current code, so
be ready for them.

---

## 1. "What if Redis is down?"

**Q: What happens when the upload tries to add a job but Redis is unreachable?**
- `videoQueue.add(...)` throws. The controller catches it and returns 500 "Upload failed".
- **But** — the video is already in S3 and the DB row is already QUEUED. So the video is
  stuck: uploaded but never processed.

**Q: How would you fix that?**
> "I'd add retry logic and possibly a dead-letter approach: keep a retry on queue add with
> backoff, or a reconciliation job that scans for videos stuck in QUEUED/PROCESSING for a
> long time and re-queues them. BullMQ also supports job retries natively."

## 2. "What if the worker fails the job?"

**Q: A video fails to transcode. What does the user see?**
- Currently: the `failed` event just logs. The DB status stays `PROCESSING` forever, and the
  frontend keeps showing "processing" and blocks playback. That's a real bug to acknowledge.

**Q: How would you fix it?**
> "In the worker, catch errors and update the video status to FAILED, and surface a meaningful
> error message to the frontend. Also configure BullMQ retries with backoff, and only mark
> FAILED after the last attempt."

## 3. "What if the server restarts mid-upload?"

**Q: The file is saved by multer to `uploads/` but the request never finishes. What happens?**
- The temp file is orphaned on disk. There's no cleanup for this case.

**Q: How would you handle it?**
> "A scheduled cleanup job that removes files older than some age from the uploads folder.
> AWS S3 multipart uploads would be a more robust alternative, or direct-to-S3 uploads from
> the browser to avoid touching local disk entirely."

## 4. "What if two users upload the same video?"

**Q: Are the S3 keys unique?**
> "Yes — every upload gets a new CUID id first, and the key is `raw/<videoId>/original.mp4`.
> Since ids are unique, the keys never collide."

## 5. "How would you handle a huge 10 GB file?"

**Q: Can you upload a 10 GB file through this system right now?**
> "Not well. Multer saves the whole file to local disk first (no size limit is set), then the
> controller uploads it to S3 as a single PutObject. A 10 GB file could run out of disk or
> timeout. I'd set size limits, use S3 multipart upload (or presigned direct uploads), and
> stream instead of buffering."

## 6. "What if the frontend polls for status?"

**Q: How does the frontend know when the video is ready?**
> "Right now the user has to manually refresh / re-select the video. There's no polling or
> websocket. I'd add either polling every few seconds or a WebSocket/SSE event when the worker
> marks the video COMPLETED, then auto-refresh the list."

## 7. "Is your stream URL secure?"

**Q: Anyone with the video id can stream it. Why?**
> "The stream endpoint builds a plain public S3 URL. If the bucket is public, anyone can
> access it. I'd generate **presigned URLs** (there's already a `getS3SignedUrl` helper used
> elsewhere) so access is temporary and authorized, or use CloudFront with signed cookies."

## 8. "How would you add thumbnails?"

**Q: The video list shows no preview image. How would you add one?**
> "Add an FFmpeg step in the worker: extract a frame (e.g. `-vf select=eq(n\,N)`) and upload
> it to S3, store its key on the Video record, and have the frontend show it. I'd do this
> inside the same worker job so it happens automatically."

## 9. "What does the $transaction in lesson upload actually guarantee?"

**Q: Why use a transaction when creating the video and linking it to the lesson?**
> "So the Video row and the Lesson link are atomic — if the Lesson update fails, the Video
> insert rolls back too. Otherwise I'd get orphaned Video rows or a lesson pointing to a
> video that doesn't exist."

**Q: But the S3 upload happens after the transaction. What if S3 fails?**
> "That's the acknowledged gap — the transaction already committed, so on S3 failure I set
> the video status to FAILED and clean up the file (that's what the catch block does). A
> stronger design would upload to S3 first, then transact."

## 10. "How do you scale the worker?"

**Q: One worker = one video at a time. How do you process more?**
> "Start more worker processes or containers. BullMQ coordinates them via Redis — each worker
> pulls the next job, so multiple workers process different videos in parallel. I'd cap
> concurrency per worker (e.g. 2–4 jobs) because FFmpeg eats CPU, and auto-scale workers based
> on queue length."

## 11. "What about the FFmpeg scale filter?"

**Q: Why `force_original_aspect_ratio=decrease:force_divisible_by=2`?**
> "So width is computed from height keeping the aspect ratio (no stretching), it never
> upscales beyond the source, and the width stays divisible by 2 — H.264 requires even
> dimensions. `scale=w=-2` means 'width = whatever keeps aspect ratio, even'."

**Q: What if the source is smaller than 1080p?**
> "With `force_original_aspect_ratio=decrease`, a 720p source won't be upscaled to fake 1080p
> — the 1080p rendition stays at native size. That's the intended behavior."

## 12. "Why 6-second segments?"

**Q: What does `-hls_time 6` do and is it a good choice?**
> "It targets 6-second segments. Shorter segments = faster start but more requests; longer
> segments = fewer requests but slower quality switches and seeking. 6 seconds is a common
> balance for VOD."

## 13. "Why run the three renditions sequentially?"

**Q: You loop over variants and `await` each. Why not parallel?**
> "Because each FFmpeg process is CPU-heavy; running 3 at once could starve the box. Sequentially
> is simpler and predictable. If I had more CPU or a GPU/parallel infra, I could process them
> in parallel or use ffmpeg's built-in multi-rendition output."

## 14. "JWT — how is the refresh token used?"

**Q: You set a refresh cookie but is there an endpoint to use it?**
> "Currently no — I created the refresh token but didn't add a `/auth/refresh` endpoint.
> That's a gap I'd close: verify the refresh cookie, mint a new access token, and keep the
> user logged in beyond 30 minutes."

## 15. "How would you handle status updates without polling?"

**Q: You want the UI to update in real-time when processing finishes. Options?**
> "A WebSocket or Server-Sent Events connection. The worker (or API) pushes an event when the
> status changes, the frontend listens and refreshes just that video. SSE is simpler for
> one-way status updates; WebSocket is better if we also want interactivity."

## 16. "What is your worker's failure handling today — be honest."

**Q: What happens to the DB status when the worker throws?**
> "The job is marked failed in Redis and logged, but the Video row is not updated to FAILED.
> The frontend would show 'processing' forever. This is a known limitation — my fix is to wrap
> the worker body in try/catch, set status to FAILED, and let BullMQ retry first."
