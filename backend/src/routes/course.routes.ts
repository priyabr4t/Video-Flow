import { Router } from "express";
import { createCourseHandler, getCourseByIdHandler, getCoursesHandler } from "../controllers/course.controllers";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import { createLessonHandler } from "../controllers/lesson.controllers";

const router = Router();

router.post("/", requireAuth, requireRole("INSTRUCTOR"), createCourseHandler);
router.get("/", requireAuth, requireRole("INSTRUCTOR", "STUDENT"), getCoursesHandler);
router.get("/:courseId", requireAuth, requireRole("INSTRUCTOR", "STUDENT"), getCourseByIdHandler);
router.post("/:courseId/lessons", requireAuth, requireRole("INSTRUCTOR", "ADMIN"), createLessonHandler);

export default router;