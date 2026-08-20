# 04 — Database Design

Managed with **Prisma ORM** against **PostgreSQL**. Schema lives in
`backend/prisma/schema.prisma`.

## Models & relationships (high level)

```text
User  1 ──── * Course  1 ──── * Lesson  0..1 ──── 1 Video
```

- A **User** can own many **Courses** (as instructor).
- A **Course** has many **Lessons**.
- A **Lesson** optionally points to one **Video** (a lesson has at most one video).
- A **Video** can optionally belong to one Lesson.

## Video table

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | Primary key |
| status | VideoStatus | Default `QUEUED`; source of truth for "ready to stream?" |
| createdAt | DateTime | Auto now |
| updatedAt | DateTime | Auto on update |
| hlsMasterKey | String? | S3 key of master.m3u8 when done |
| originalKey | String? | S3 key of raw uploaded file |
| lesson | Lesson? | Relation back to a lesson |

### VideoStatus enum

```prisma
enum VideoStatus {
  QUEUED
  PROCESSING
  COMPLETED
  FAILED
}
```

- **QUEUED** — uploaded, job added to queue.
- **PROCESSING** — worker is transcoding.
- **COMPLETED** — HLS package is in S3, ready to stream.
- **FAILED** — something went wrong; used in lesson upload error path.

> **Note**: `UPLOADING` was previously in the enum but is not used by the current flow.
> It has been removed to keep the status model aligned with actual usage.

## User table

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| name | String | |
| email | String (unique) | Normalised to lowercase on register |
| password | String | bcrypt hash — never store plain text |
| role | UserRole | Default `STUDENT` |
| createdAt / updatedAt | DateTime | |

### UserRole enum

```prisma
enum UserRole {
  STUDENT
  INSTRUCTOR
  ADMIN
}
```

Used by `requireRole` middleware to restrict routes (e.g. instructors own courses, admins can do anything).

## Course table

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| title | String | |
| description | String? | |
| instructorId | String | FK → User |
| instructor | User | Relation "InstructorCourses" |

## Lesson table

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| title | String | |
| courseId | String | FK → Course |
| course | Course | Relation |
| videoId | String? (unique) | FK → Video |
| video | Video? | Relation |
| order | Int | Position inside the course |

## Notable Prisma features used

- **`@id @default(cuid())`** — CUID string IDs, no auto-increment needed (good for distributed systems).
- **`@updatedAt`** — auto-updates the timestamp.
- **`$transaction`** — used in lesson video upload: creating a Video and linking it to a Lesson happen atomically. If either fails, both roll back.
- **`select`** — returns only specific fields (e.g. register response hides the password).
- **`include`** — fetches related rows (e.g. course → instructor, lessons → video).

## Example queries in the code

```ts
// create a video row (status defaults to QUEUED)
prisma.video.create({ data: {} })

// fetch one video
prisma.video.findUnique({ where: { id } })

// list videos newest first
prisma.video.findMany({ orderBy: { createdAt: "desc" } })

// atomic create + link (lesson upload)
prisma.$transaction(async (tx) => {
  const video = await tx.video.create({ data: {} });
  await tx.lesson.update({ where: { id }, data: { videoId: video.id } });
  return video;
});
```

## "Why PostgreSQL + Prisma?" quick answer

> "I used PostgreSQL because it's a reliable relational database that handles relationships
> like courses → lessons → videos cleanly. Prisma gives me type-safe queries, migrations, and
> a schema I can read at a glance, which made building the CRUD + status tracking much faster."
