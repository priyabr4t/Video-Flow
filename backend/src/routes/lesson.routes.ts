import {Router} from "express";
import { createLessonHandler, uploadLessonVideoHandler } from "../controllers/lesson.controllers";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";

const router = Router();

router.post("/:lessonId/videos", requireAuth, requireRole("INSTRUCTOR", "ADMIN"), uploadLessonVideoHandler);

export default router;