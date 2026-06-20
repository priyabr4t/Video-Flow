import { Worker } from "bullmq";
import { connection } from "../queue/connection"
import { prisma } from "../lib/prisma";
import { downloadFromS3 } from "../storage/downloadFromS3";
import { transcodeVideo } from "../services/transcodeVideo";

const worker = new Worker(
    "video-processing",
    async (job) => {
        console.log("Job received:", job.id);
        console.log("Video ID:", job.data.videoId);

        // job arrives
        const videoId = job.data.videoId

        // find video
        const video = await prisma.video.findUnique({
            where: {
                id: videoId
            }
        })

        if (!video) {
            throw new Error(`Video ${videoId} not found`);
        }

        if (!video.originalKey) {
            throw new Error(`Video ${videoId} has no originalKey`);
        }

        // update status
        await prisma.video.update({
            where: {
                id: videoId,
            },
            data: {
                status: "PROCESSING"
            }
        })

        // download video from s3
        const localPath = await downloadFromS3(video!.originalKey!, `${videoId}.mp4`)

        console.log("Starting transcoding...");

        // transcode video to 360p using ffmpeg and save to temp folder
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

        // do some processing here...
        console.log(`Downloaded video ${videoId} to ${localPath}`);
    },
    {
        connection
    }
)

console.log("Worker started...");