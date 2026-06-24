import express from "express"
import { registerHandler } from "../controllers/auth.controllers"

const router = express.Router()

router.post("/register", registerHandler)

export default router