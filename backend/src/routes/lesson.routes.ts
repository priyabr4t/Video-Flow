import {Router} from "express";
import { createLessonHandler, getLessonVideoHandler, uploadLessonVideoHandler } from "../controllers/lesson.controllers";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import { upload } from "../configs/multer";

const router = Router();

router.post("/:lessonId/videos", requireAuth, requireRole("INSTRUCTOR", "ADMIN"), upload.single("video"), uploadLessonVideoHandler);
router.get("/:lessonId/videos", requireAuth, requireRole("INSTRUCTOR", "ADMIN"), getLessonVideoHandler);
export default router;