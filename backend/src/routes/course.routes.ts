import {Router} from "express";
import { createCourseHandler } from "../controllers/course.controllers";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";

const router = Router();

router.post(
    "/",
    requireAuth,
    requireRole("INSTRUCTOR"),
    createCourseHandler
);

export default router;