import express from "express"
import { registerHandler, loginHandler } from "../controllers/auth.controllers"
import { requireAuth, requireRole } from "../middlewares/auth.middleware"
const router = express.Router()

router.post("/register", registerHandler)
router.post("/login", loginHandler)
router.get("/me", requireAuth, (req, res) => {
    return res.json({
        user: req.user,
    });
});
router.post(
    "/courses",
    requireAuth,
    requireRole("INSTRUCTOR"),
    createCourse
);

export default router