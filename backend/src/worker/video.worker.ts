import { Worker } from "bullmq";
import { connection } from "../queue/connection"
import { prisma } from "../lib/prisma";
import { downloadFromS3 } from "../storage/downloadFromS3";
import { transcodeVideo } from "../services/transcodeVideo";
import { uploadToS3 } from "../storage/uploadToS3";
import fs from "fs";

const worker = new Worker(
    "video-processing",
    async (job) => {
        console.log("Job received:", job.id);
        console.log("Video ID:", job.data.videoId);

        // GET VIDEO ID FROM JOB DATA
        const videoId = job.data.videoId

        // GET VIDEO FROM DATABASE
        const video = await prisma.video.findUnique({
            where: {
                id: videoId
            }
        })

        // CHECK IF VIDEO EXISTS AND HAS ORIGINAL KEY
        if (!video) {
            throw new Error(`Video ${videoId} not found`);
        }

        if (!video.originalKey) {
            throw new Error(`Video ${videoId} has no originalKey`);
        }

        // UPDATE VIDEO STATUS TO PROCESSING
        await prisma.video.update({
            where: {
                id: videoId,
            },
            data: {
                status: "PROCESSING"
            }
        })

        // DOWNLOAD VIDEO FROM S3 TO TEMP FOLDER
        const localPath = await downloadFromS3(video!.originalKey!, `${videoId}.mp4`)
        console.log("Starting transcoding...");

        // TRANSCODE VIDEO TO 360p, 720p, 1080p AND SAVE TO TEMP FOLDER
        console.log(`Transcoding video ${videoId} to 360p...`);

        const p360Path = `temp/${videoId}-360p.mp4`;
        const p720Path = `temp/${videoId}-720p.mp4`;
        const p1080Path = `temp/${videoId}-1080p.mp4`;

        await transcodeVideo(localPath, p360Path, 640, 360);
        await transcodeVideo(localPath, p720Path, 1280, 720);
        await transcodeVideo(localPath, p1080Path, 1920, 1080);

        console.log(
            `Transcoded video saved at ${p360Path}, ${p720Path}, ${p1080Path}`
        );

        // UPLOAD TRANSCODED VIDEOS TO S3
        const p360Key = `processed / ${videoId}/360p.mp4`;
        const p720Key = `processed/${videoId}/720p.mp4`;
        const p1080Key = `processed/${videoId}/1080p.mp4`;

        await uploadToS3(p360Path, p360Key);
        await uploadToS3(p720Path, p720Key);
        await uploadToS3(p1080Path, p1080Key);

        // STORE S3 KEYS IN DATABASE & UPDATE VIDEO STATUS TO COMPLETED
        await prisma.video.update({
            where: {
                id: videoId,
            },
            data: {
                p360: p360Key,
                p720: p720Key,
                p1080: p1080Key,
                status: "COMPLETED"
            }
        })

        // DELETE TEMP FILES
        fs.unlinkSync(localPath);
        fs.unlinkSync(p360Path);
        fs.unlinkSync(p720Path);
        fs.unlinkSync(p1080Path);

        console.log(`Video ${videoId} processed successfully.`);

    },
    {
        connection
    }
)

console.log("Worker started...");