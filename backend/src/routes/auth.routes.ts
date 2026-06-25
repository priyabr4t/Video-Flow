import express from "express"
import { registerHandler, loginHandler } from "../controllers/auth.controllers"
import { requireAuth, requireRole } from "../middlewares/auth.middleware"
import { createCourseHandler } from "../controllers/course.controllers"
const router = express.Router()

router.post("/register", registerHandler)
router.post("/login", loginHandler)
router.get("/me", requireAuth, (req, res) => {
    return res.json({
        user: req.user,
    });
});


export default router