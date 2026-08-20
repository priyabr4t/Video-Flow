# 03 — Flow Diagrams

These are the flows you should be able to **describe out loud** and ideally **draw**.

---

## 1. Video Upload Flow (API side)

```text
User picks file
      │
      ▼
POST /videos/upload   (multipart/form-data, field name: "video")
      │
      ▼
multer saves file to disk (uploads/)
      │
      ▼
Controller: req.file present?
      │   no ──► 400 "No file uploaded"
      ▼ yes
Create empty Video row in DB (status defaults to QUEUED)
      │
      ▼
key = "raw/<videoId>/original.mp4"
      │
      ▼
Upload file from disk → S3 (PutObject)
      │
      ▼
Update DB row: originalKey = key, status = QUEUED
      │
      ▼
Add job to BullMQ queue: { videoId }
      │
      ▼
Delete local temp file (fs.unlinkSync)
      │
      ▼
Respond: { success: true, videoId }
```

**Key point**: the user gets a response *immediately* — no waiting for transcoding.

---

## 2. Worker Processing Flow (background)

```text
Worker picks job from "video-processing" queue
      │
      ▼
Find video in DB
      │  missing ──► throw Error (job fails)
      ▼
Update status → PROCESSING
      │
      ▼
Download raw video from S3 → temp/<videoId>.mp4
      │
      ▼
For each variant (360p, 720p, 1080p):
      │
      ▼
  FFmpeg → scale to target height, H.264 + AAC,
           segment 6s → temp/<videoId>/<name>/
           index.m3u8 + .ts segments
      │
      ▼
Generate master.m3u8 (links all 3 variant playlists)
      │
      ▼
Recursively upload temp/<videoId>/ → S3 "processed/<videoId>/"
      │
      ▼
Update DB: hlsMasterKey = "processed/<videoId>/master.m3u8",
           status = COMPLETED
      │
      ▼
Cleanup: delete temp files & folder
```

**Failure path**: if any step throws, the job fails. The `failed` event logs it.
DB status stays PROCESSING (in the current code) — see 10-cross-questions for discussion.

---

## 3. HLS Package layout (what S3 ends up with)

```text
processed/<videoId>/
├── master.m3u8
├── 360p/
│   ├── index.m3u8
│   └── 360p_000.ts, 360p_001.ts, ...
├── 720p/
│   ├── index.m3u8
│   └── 720p_000.ts, ...
└── 1080p/
    ├── index.m3u8
    └── 1080p_000.ts, ...
```

---

## 4. Streaming Flow (frontend)

```text
User clicks a COMPLETED video
      │
      ▼
GET /videos/:id/stream
      │
      ▼
Find video in DB
      │  not found ──► 404 "Video not found"
      ▼
status !== COMPLETED ──► 400 "Video is still processing"
      │
      ▼
no hlsMasterKey ──► 404 "Stream not found"
      │
      ▼
streamUrl = "https://<bucket>.s3.<region>.amazonaws.com/
            processed/<videoId>/master.m3u8"
      │
      ▼
Return { streamUrl }
      │
      ▼
HLS.js loads master.m3u8, picks best variant by bandwidth
      │
      ▼
Video plays with adaptive bitrate
```

---

## 5. Job Lifecycle (statuses)

```text
            ┌──► FAILED (on error)
            │
QUEUED ────► PROCESSING ────► COMPLETED
 (uploaded)   (worker working)  (ready to stream)
```

Also in the DB enum: `UPLOADING` (defined but not used in the upload flow).

---

## 6. Auth Flow (register / login)

```text
POST /auth/register  { name, email, password }
      │
      ▼
Zod validate ──► 400 if invalid
      │
      ▼
Check email not taken ──► 409 if exists
      │
      ▼
hash password (bcrypt, salt 10)
      │
      ▼
Create user (role = STUDENT)
      │
      ▼
201 "User registered"

POST /auth/login  { email, password }
      │
      ▼
Find user + compare bcrypt hash ──► 401 if mismatch
      │
      ▼
accessToken = JWT (30 min, payload: { sub, role })
refreshToken = JWT (7 days) → set as httpOnly cookie
      │
      ▼
200 { accessToken, user }
```

**Protected routes**: send `Authorization: Bearer <accessToken>`.
`requireAuth` verifies it, `requireRole(...)` checks role.
