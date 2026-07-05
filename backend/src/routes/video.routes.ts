import { Router } from "express";
import { upload } from "../configs/multer";
import { uploadVideo, getVideos, getVideoStream, getAllVideos } from "../controllers/video.controllers";

const router = Router();

router.post("/upload", upload.single("video"), uploadVideo);
router.get("/", getAllVideos);
router.get("/:id", getVideos);
router.get("/:id/stream", getVideoStream);

export default router;