import { Router } from "express";
import { createCourseHandler, getCourseByIdHandler, getCoursesHandler } from "../controllers/course.controllers";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";

const router = Router();

router.post("/", requireAuth, requireRole("INSTRUCTOR"), createCourseHandler);
router.get("/", requireAuth, requireRole("INSTRUCTOR", "STUDENT"), getCoursesHandler);
router.get("/:courseId", requireAuth, requireRole("INSTRUCTOR", "STUDENT"), getCourseByIdHandler);

export default router;