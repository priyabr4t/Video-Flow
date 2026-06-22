import { Router } from "express";
import { upload } from "../configs/multer";
import { uploadVideo, getVideos } from "../controllers/video.controllers";

const router = Router();

router.post("/upload", upload.single("video"), uploadVideo);
router.get("/:id", getVideos);

export default router;