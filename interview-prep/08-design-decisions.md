# 08 — Design Decisions ("Why did you use X?")

These are the answers to the most common "why" questions. Keep them short, honest, and
specific to VideoFlow.

---

## Why a queue + background worker instead of transcoding inline?

> Transcoding is CPU-heavy and can take minutes. If I did it inside the upload request, the
> request would block for minutes and the user would just stare at a spinner. Instead the
> upload returns immediately with a `videoId`, and a separate worker process handles the
> heavy work. The queue (BullMQ) is the bridge that makes this reliable — jobs aren't lost
> if a worker dies; they sit in Redis.

## Why BullMQ (and Redis) over a simple in-memory array?

> An in-memory array lives inside one process — if the server restarts, pending jobs are gone,
> and you can't share them across multiple worker processes. Redis is a durable, fast data
> store that many processes can read from. BullMQ adds the queue semantics (waiting, active,
> delayed, retries, events) on top of Redis, so I get reliability and observability for free.

## Why AWS S3?

> Video files are big and the API server would otherwise fill its disk. S3 is scalable
> object storage, so the API stays **stateless** — I can run many API servers behind a load
> balancer and they don't hold any files. Also, S3 URLs (or presigned URLs) can serve the
> video directly to the browser without going through the backend.

## Why HLS instead of serving one MP4?

> A single MP4 downloads the whole file before it can play (or requires heavy server-side
> range requests). HLS splits the video into small segments and lets the player start almost
> instantly, and — more importantly — it enables **adaptive bitrate streaming**: the player
> switches between 360p/720p/1080p based on the user's bandwidth. That's what streaming
> services actually do.

## Why three renditions (360p/720p/1080p)?

> Those cover the common range: mobile/weak connections (360p), typical HD (720p), and
> full HD (1080p). The master playlist advertises each one's bandwidth so HLS.js can pick
> the best match automatically. (I could add 144p/480p/4K later; 3 is a reasonable start.)

## Why a separate worker process at all?

> Two reasons: (1) **responsiveness** — the API stays fast; (2) **scalability** — if the
> queue backs up, I can start more worker instances without touching the API. It also means a
> transcoding crash doesn't take down the web server.

## Why PostgreSQL + Prisma?

> The data is relational (courses → lessons → videos, users → courses), so a relational DB
> fits naturally. Prisma gives typed queries, an easy-to-read schema, and migrations, which
> made development faster and caught errors at compile time.

## Why store only keys in the DB and files in S3?

> The database should be small and fast. I store the S3 **key** (a string like
> `raw/<videoId>/original.mp4`) rather than the file itself. The file lives in S3; the DB
> just knows where it is and what status the video is in. This keeps the DB lean and the
> storage scalable.

## Why JWT + httpOnly refresh cookie instead of sessions?

> JWT means the server doesn't keep session state per user — any API server can verify a
> token, which scales horizontally. The access token is short-lived (30 min), and the refresh
> token lives in an **httpOnly cookie**, so JavaScript can't read it (XSS protection).

## Why bcrypt for passwords?

> bcrypt hashes are salted and deliberately slow, which makes brute-force and rainbow-table
> attacks impractical. I never store plain-text passwords.

## Why Zod?

> It's a lightweight way to validate request bodies at the edge of the API. Instead of
> hand-writing `if (!email) return 400`, I define a schema once and get validation + typed
> data.

## Why spawn FFmpeg as a child process?

> FFmpeg is a separate program. `child_process.spawn` launches it without blocking Node's
> event loop — Node keeps serving requests while FFmpeg works. I wrap the close event in a
> Promise so the worker can `await` each rendition sequentially.

## Why is the upload handler so fast but the video not ready instantly?

> Upload and processing are decoupled on purpose. The upload endpoint does the quick parts
> (save file → S3 → queue job → return `videoId`). The slow parts (download, transcode, upload
> HLS, update status) happen in the worker. That's why the frontend shows a status badge
> (QUEUED/PROCESSING/COMPLETED) and disables playback until COMPLETED.
