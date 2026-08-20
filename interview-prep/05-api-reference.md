# 05 — API Reference

Base URL: `http://localhost:4000/api`

> Note: in `app.ts` routes are mounted at `/videos`, `/auth`, `/courses`, `/lessons`
> (not under `/api`). The README mentions `/api` as the base.

---

## Video endpoints

### POST /videos/upload
Uploads a video. **Content-Type: multipart/form-data**, file field name: `video`.

- Uses multer (`upload.single("video")`) → file saved to `uploads/` on disk.
- Stores original in S3 at `raw/<videoId>/original.mp4`, queues a job, returns immediately.

| Status | Body |
|--------|------|
| 200 | `{ "success": true, "videoId": "..." }` |
| 400 | `{ "message": "No file uploaded" }` |
| 500 | `{ "message": "Upload failed" }` |

### GET /videos
Lists all videos, newest first.

| Status | Body |
|--------|------|
| 200 | `[ { id, status, originalKey, hlsMasterKey, createdAt, updatedAt } ]` |
| 500 | `{ "message": "Failed to fetch videos" }` |

### GET /videos/:id
Fetches one video and includes a **signed** stream URL if it has an HLS master key.

| Status | Body |
|--------|------|
| 200 | `{ id, status, originalKey, hlsMasterKey, createdAt, updatedAt, streamUrl }` |
| 404 | `{ "message": "Video not found" }` |
| 500 | `{ "message": "Failed to fetch video" }` |

### GET /videos/:id/stream
Returns the HLS master playlist URL (currently a plain S3 URL, not signed — see 11-improvements).

| Status | Body |
|--------|------|
| 200 | `{ "streamUrl": "https://<bucket>.s3.<region>.amazonaws.com/processed/<id>/master.m3u8" }` |
| 400 | `{ "message": "Video is still processing" }` |
| 404 | `{ "message": "Video not found" }` or `{ "message": "Stream not found" }` |

**Logic order**: 404 (video missing) → 400 (status !== COMPLETED) → 404 (no hlsMasterKey) → 200.

---

## Auth endpoints

### POST /auth/register
Body: `{ name, email, password }` (validated by Zod).

Password rules: min 6 chars, must contain uppercase, lowercase, number, special char.

| Status | Body |
|--------|------|
| 201 | `{ "message": "User registered", "user": { id, name, email, role, createdAt } }` |
| 400 | `{ "message": "Invalid data", "errors": ... }` |
| 409 | `{ "message": "This email is already in use, please try different email" }` |
| 500 | `{ "message": "Internal server error" }` |

### POST /auth/login
Body: `{ email, password }`.

- On success: returns `accessToken` (JWT, 30 min) and sets `refreshToken` as an **httpOnly cookie** (7 days).

| Status | Body |
|--------|------|
| 200 | `{ "message": "Logged in successfully", "accessToken", "user": { id, email, role } }` |
| 400 | `{ "message": "Invalid email id or password" }` |
| 401 | `{ "message": "Invalid email id or password" }` |
| 500 | `{ "message": "Internal server error" }` |

---

## Course endpoints

### POST /courses  (auth: requireAuth)
Body: `{ title, description }`. Creates a course owned by the logged-in user.

| Status | Body |
|--------|------|
| 201 | `{ "message": "Course created successfully", "course": {...} }` |
| 400 | `{ "message": "Title and description are required" }` |
| 401 | `{ "message": "Unauthorized" }` |
| 500 | `{ "message": "Internal server error" }` |

### GET /courses
Lists courses with instructor name and lesson count.

| Status | Body |
|--------|------|
| 200 | `{ "message": "Courses fetched successfully", "courses": [...] }` |

### GET /courses/:courseId
Fetches one course with instructor, ordered lessons, and each lesson's video status + p360/p720/p1080 keys.

| Status | Body |
|--------|------|
| 200 | `{ "message": "Course fetched successfully", "course": {...} }` |
| 404 | `{ "message": "Course not found" }` |

---

## Lesson endpoints

### POST /courses/:courseId/lessons  (auth: requireAuth)
Body: `{ title, order }`. Only the course instructor or an ADMIN can create.

| Status | Body |
|--------|------|
| 201 | `{ "message": "Lesson created successfully", "lesson": {...} }` |
| 400 | `{ "message": "Lesson title is required" }` / `"Order must be a positive integer"` |
| 401 | `{ "message": "Unauthorized" }` |
| 403 | `{ "message": "You cannot add lessons to this course" }` |
| 404 | `{ "message": "Course not found" }` |
| 409 | `{ "message": "A lesson already exists at this order" }` |

### POST /courses/:courseId/lessons/:lessonId/video  (auth: requireAuth, multipart)
Uploads a video for a lesson. Uses a **$transaction** to create the Video and link it to the Lesson atomically.

| Status | Body |
|--------|------|
| 201 | `{ "message": "Video uploaded successfully", lessonId, videoId }` |
| 400 | `{ "message": "No video uploaded" }` |
| 401 | `{ "message": "Unauthorized" }` |
| 403 | `{ "message": "You do not own this course" }` |
| 404 | `{ "message": "Lesson not found" }` |
| 409 | `{ "message": "This lesson already has a video" }` |
| 500 | `{ "message": "Failed to upload video" }` |

### GET /lessons/:lessonId/video  (auth: requireAuth)
Returns the lesson's video and signed S3 URLs for each rendition.

| Status | Body |
|--------|------|
| 200 | `{ id, status, p360Url, p720Url, p1080Url }` |
| 404 | `{ "message": "Lesson not found" }` / `{ "message": "No video associated with this lesson" }` |

---

## Other

### GET /health
| Status | Body |
|--------|------|
| 200 | `{ "status": "ok" }` |

## Auth header format

```http
Authorization: Bearer <accessToken>
```
