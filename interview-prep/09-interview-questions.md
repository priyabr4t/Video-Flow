# 09 — Interview Questions (probable + model answers)

Practice reading each question and answering out loud in 1–2 minutes. Model answers are
short and structured. They're meant to be a *base*, not a script to memorize.

---

## A. Project walkthrough

**Q1: Tell me about a project you've built.**
> "I built VideoFlow, a video transcoding and adaptive streaming service. Users upload a
> video, it gets stored in S3 and a background job is queued. A separate worker transcodes it
> into three HLS quality levels with FFmpeg, uploads the HLS package to S3, and updates a
> status field in PostgreSQL. The React frontend lists videos and plays them with HLS.js.
> I chose this design because transcoding is slow, so it runs asynchronously and never blocks
> the upload request."

**Q2: What was the hardest problem you solved?**
> "Making the transcoding pipeline reliable. The API has to return instantly, but the video
> only becomes streamable later. I solved it with a BullMQ queue — the API produces a job and
> a worker consumes it, updating the video status at each stage so the frontend always knows
> whether to show 'processing' or 'play'."

**Q3: Why did you choose these technologies?**
> "Node/Express for the API because it's fast to build and TypeScript keeps it safe. BullMQ
> on Redis because it's a reliable queue that survives restarts and scales. S3 because it
> keeps the API stateless. FFmpeg + HLS for adaptive streaming, PostgreSQL + Prisma for a
> typed relational schema."

---

## B. The video pipeline

**Q4: Walk me through what happens when a user uploads a video.**
> "Multer saves the file to disk. The controller creates an empty Video row (getting an id),
> uploads the file to S3 at `raw/<id>/original.mp4`, updates the row with the key and status
> QUEUED, adds a BullMQ job with the video id, deletes the temp file, and returns the id to
> the client — all in a few hundred milliseconds. The worker later picks up the job and does
> the transcoding."

**Q5: How does the worker process a job?**
> "It looks up the video, sets status to PROCESSING, downloads the original from S3, runs
> FFmpeg three times to produce 360p/720p/1080p HLS renditions, generates a master playlist,
> uploads the whole folder to S3, sets `hlsMasterKey` and status COMPLETED, and cleans up temp
> files. Each rendition gets its own `index.m3u8` and `.ts` segments."

**Q6: What happens if the worker crashes mid-job?**
> "The job stays in Redis in a pending/failed state. When the worker restarts, BullMQ can
> retry it depending on configuration. I configured retries with backoff and mark the video FAILED
> after the final attempt so the frontend can show an error and the UI doesn't stick on 'processing'."

**Q7: Why not just wait for the video to be ready before responding?**
> "Because transcoding can take minutes. Blocking the request that long would be terrible UX
> and would tie up server resources. Async processing lets the upload respond instantly and
> the video appear when ready — exactly how YouTube and similar platforms work."

**Q8: What would you do if the queue is backed up?**
> "I'd scale horizontally by running more worker instances. BullMQ coordinates them via Redis —
> each worker pulls the next job, so multiple workers process different videos in parallel. I'd
> also set a sensible concurrency per worker (2–4 jobs max) since FFmpeg is CPU-heavy, and
> auto-scale workers based on queue length."

---

## C. HLS & streaming

**Q9: What is HLS and how does adaptive bitrate streaming work?**
> "HLS splits a video into small segments and uses playlist files to describe them. The
> master playlist lists each quality variant with its bandwidth. The player (HLS.js) measures
> the connection and switches between 360p/720p/1080p automatically, so playback continues
> smoothly even when bandwidth changes."

**Q10: What's the difference between master.m3u8 and the variant index.m3u8?**
> "A variant playlist (`360p/index.m3u8`) points to the actual `.ts` segments of one quality.
> The master playlist (`master.m3u8`) points to the variant playlists and carries their
> bandwidth/resolution, so the player knows what choices it has."

**Q11: How does the frontend play the video?**
> "The frontend calls `GET /videos/:id/stream`, gets the master playlist URL, and passes it
> to HLS.js, which attaches to the `<video>` element, loads the master playlist, picks a
> variant, and streams the segments. On Safari I fall back to the browser's native HLS support."

---

## D. Queueing & Redis

**Q12: What is BullMQ? Why Redis?**
> "BullMQ is a queue library on top of Redis. The API adds jobs to the `video-processing`
> queue; workers consume them. Redis is a fast in-memory store that holds the queue, so jobs
> survive process restarts and multiple workers can consume in parallel."

**Q13: Producer vs consumer?**
> "The API server is the producer — it adds jobs. The worker is the consumer — it processes
> them. They communicate only through the queue, which decouples them. I can scale workers
> independently of the API."

**Q14: What if Redis is down?**
> "The `videoQueue.add(...)` call throws. I'd add retry logic with backoff on queue add, or a
> reconciliation job that scans for videos stuck in QUEUED/PROCESSING for too long and re-queues
> them. BullMQ also supports native job retries."

---

## E. Storage & database

**Q15: Why store files in S3 instead of the database or local disk?**
> "Files in a database bloat it and are slow; files on local disk don't scale and make the
> server stateful. S3 is cheap, durable, scalable object storage, and the API stays stateless.
> The DB only stores the S3 keys and the video status."

**Q16: What's in the Video table?**
> "id, status (QUEUED/PROCESSING/COMPLETED/FAILED), originalKey, hlsMasterKey, createdAt,
> updatedAt, and an optional relation to a Lesson. originalKey points to the uploaded file,
> hlsMasterKey points to the processed master playlist."

**Q17: Why use Prisma?**
> "Typed queries, a readable schema, easy migrations, and transactions. For example,
> attaching a video to a lesson uses `$transaction` so both the Video insert and the Lesson
> update succeed or fail together. This prevents orphaned Video rows or a lesson pointing to
> a video that doesn't exist."

---

## F. Auth & security

**Q18: How does auth work in your project?**
> "Register hashes the password with bcrypt. Login verifies it and returns a JWT access
> token (30 min) plus an httpOnly refresh-token cookie (7 days). `requireAuth` middleware
> verifies the Bearer token on protected routes; `requireRole` restricts routes by role
> (STUDENT/INSTRUCTOR/ADMIN)."

**Q19: Why httpOnly cookie for the refresh token?**
> "So JavaScript can't read it — that protects it from XSS attacks. The access token is sent
> in the Authorization header for API calls."

**Q20: How do you protect against invalid input?**
> "Zod schemas validate request bodies before any database work. Uploads go through multer.
> Passwords are bcrypt-hashed. Role checks prevent students from, say, adding lessons to
> courses they don't own."

**Q21: How would you sign stream URLs?**
> "The stream endpoint currently returns a plain S3 URL. I'd use the existing presigned URL
> helper (1-hour validity) so access is temporary and authorized, or use CloudFront with signed
> cookies/URLs so only paying/authorized users can stream the video."

---

## G. Node.js fundamentals

**Q22: Is Node.js single-threaded? How does it handle concurrency?**
> "JavaScript runs on a single thread, but Node uses an event loop with async I/O, so it can
> handle many concurrent requests without blocking. Slow operations like DB queries and S3
> calls return promises. But CPU-heavy work like FFmpeg would block the loop — that's exactly
> why it runs in a separate worker process."

**Q23: What is a promise and how do you use them here?**
> "A promise represents an operation that completes later. All my async functions — S3 uploads,
> DB queries, the FFmpeg wrapper — return promises, and I `await` them in sequence. The FFmpeg
> wrapper resolves when the process exits with code 0 and rejects otherwise."

**Q24: How would you handle status updates without polling?**
> "A WebSocket or Server-Sent Events connection. The worker (or API) pushes an event when the
> status changes, the frontend listens and refreshes just that video. SSE is simpler for
> one-way status updates; WebSocket is better if we also want interactivity."

---

## H. Scaling & operations

**Q25: How would you scale to 10×/100× traffic?**
> "The queue + worker model already scales: I'd run more workers. I'd move to a hosted Redis
> (e.g. ElastiCache), add a CDN (CloudFront) in front of S3 for better playback performance,
> and possibly auto-scale workers based on queue length. The API stays stateless so it's easy
> to add instances behind a load balancer. For massive scale, I'd look at a dedicated transcoding
> service (e.g. Mux, Cloudflare Stream) or GPU-accelerated workers."

**Q26: What if two users upload the same video?**
> "Yes — every upload gets a new CUID id first, and the key is `raw/<videoId>/original.mp4`.
> Since ids are unique, the keys never collide. If I wanted content deduplication, I'd hash the
> file and check against existing videos, but for this project unique ids per upload suffice."

**Q27: How would you handle a huge 10 GB file?**
> "Not well with the current setup — multer saves the whole file to local disk first with no
> size limit. I'd set size limits, use S3 multipart upload, or better yet, direct-to-S3 presigned
> uploads from the browser (avoids double-hop and disk usage). For very large files, I'd also
> add chunked/resumable upload support."

**Q28: What does the $transaction in lesson upload actually guarantee?**
> "So the Video row and the Lesson link are atomic — if the Lesson update fails, the Video
> insert rolls back too. Otherwise I'd get orphaned Video rows or a lesson pointing to a
> video that doesn't exist. The acknowledged gap is that S3 upload happens after the transaction
> commits; on S3 failure I set the video status to FAILED and clean up the file."

**Q29: What if the server restarts mid-upload?**
> "The temp file is orphaned on disk (`uploads/`). I'd add a scheduled cleanup job that removes
> files older than a threshold from the uploads folder, or use S3 multipart uploads / direct-to-S3
> from the browser to avoid touching local disk entirely."

**Q30: How would you add thumbnails?**
> "Add an FFmpeg step in the worker: extract a frame (e.g. `-vf select=eq(n\,N)`) and upload
> it to S3, store its key on the Video row, and have the frontend show it. I'd do this inside
> the same worker job so it happens automatically. I'd also extract duration/size/resolution
> via `ffprobe` and store that metadata."

**Q31: What about the FFmpeg scale filter?**
> "I use `force_original_aspect_ratio=decrease:force_divisible_by=2` so width is computed from
> height keeping the aspect ratio (no stretching), it never upscales beyond the source, and the
> width stays divisible by 2 — H.264 requires even dimensions. With `scale=w=-2`, width = whatever
> keeps aspect ratio, even. A 720p source won't be upscaled to fake 1080p — the 1080p rendition
> stays at native size, which is the intended behavior."

**Q32: Why 6-second segments?**
> "It targets 6-second segments. Shorter segments = faster start but more requests; longer
> segments = fewer requests but slower quality switches and seeking. 6 seconds is a common
> balance for VOD."

**Q33: Why run the three renditions sequentially?**
> "Because each FFmpeg process is CPU-heavy; running 3 at once could starve the box. Sequentially
> is simpler and predictable. If I had more CPU or a GPU/parallel infra, I could process them
> in parallel or use ffmpeg's built-in multi-rendition output."

**Q34: What happens under concurrent requests?**
> "Node's event loop handles many concurrent requests on one thread via async I/O — DB queries,
> S3 calls, and other non-blocking operations all use promises. But if many uploads come in
> simultaneously, each adds a job to the BullMQ queue, and workers process them concurrently.
> The queue decouples the load: the API accepts requests quickly, and workers process jobs at
> their own pace. I'd monitor queue length and scale workers accordingly."

---

## I. Honest "weaknesses" answers

**Q35: What would you improve in this project?**
> "The pipeline works end-to-end, but I'd harden it. The biggest gap is failure handling — when
> a job fails the video can get stuck as processing, so I'd add retries with backoff and mark
> videos FAILED properly. I'd also sign the stream URLs, add upload validation, thumbnails,
> real-time status updates with SSE or WebSocket. On the infrastructure side, Docker Compose,
> a CDN, and a CI pipeline would make it production-ready."

**Q36: What's the biggest gap you'd fix given another month?**
> "I'd add proper worker failure handling with try/catch, status updates to FAILED, and BullMQ
> retries with exponential backoff. I'd also add presigned stream URLs, upload size/type
> validation in multer, a scheduled cleanup job for orphaned upload files, thumbnails extracted
> by FFmpeg, and a CDN in front of S3. Testing would be the other major addition — unit tests
> for the FFmpeg services, integration tests for the upload flow, and contract tests for the API."

---

## J. Rapid-fire concepts

**Q37: HLS in one sentence.**
> HLS chops a video into small 6-second `.ts` segments and creates playlist files (`.m3u8`) that
> tell the player which segments to download next.

**Q38: Adaptive bitrate in one sentence.**
> The player switches between 360p/720p/1080p automatically based on internet speed, measuring
> bandwidth from the master playlist's `BANDWIDTH` values.

**Q39: BullMQ + Redis in one sentence.**
> BullMQ is a job-queue library that uses Redis to reliably pass jobs between producers and consumers.

**Q40: Prisma in one sentence.**
> A TypeScript ORM that maps database tables to typed objects, with migrations, transactions,
> and a readable schema.

**Q41: JWT in one sentence.**
> A signed token that proves who you are; the server doesn't need to look you up for every request.

**Q42: bcrypt in one sentence.**
> A password hashing function that's salted and deliberately slow, making brute-force attacks
> impractical; I never store plain-text passwords.

**Q43: Zod in one sentence.**
> A schema validation library for request bodies that protects the API from malformed input and
> returns typed data on success.

**Q44: HTTP status codes.**
> 200 success, 201 created, 400 bad request, 401 unauthorized, 403 forbidden, 404 not found,
> 409 conflict, 500 internal server error.
