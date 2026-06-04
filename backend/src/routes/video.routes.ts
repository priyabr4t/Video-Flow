import { Router } from "express";
import { upload } from "../configs/multer";
import { uploadVideo } from "../controllers/video.controllers";

const router = Router();

router.post("/upload", upload.single("video"), uploadVideo);

export default router;