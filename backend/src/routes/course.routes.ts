import { Router } from "express";
import { createCourseHandler, getCoursesHandler } from "../controllers/course.controllers";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";

const router = Router();

router.post("/", requireAuth, requireRole("INSTRUCTOR"), createCourseHandler);
router.get("/", requireAuth, requireRole("INSTRUCTOR", "STUDENT"), getCoursesHandler);

export default router;