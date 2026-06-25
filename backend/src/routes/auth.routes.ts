import express from "express"
import { registerHandler, loginHandler } from "../controllers/auth.controllers"

const router = express.Router()

router.post("/register", registerHandler)
router.post("/login", loginHandler)

export default router