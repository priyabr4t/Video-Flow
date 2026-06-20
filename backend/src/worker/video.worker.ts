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

        // update status
        await prisma.video.update({
            where: {
                id: videoId,
            },
            data: {
                status: "PROCESSING"
            }
        })

        if (!video) {
            throw new Error(`Video ${videoId} not found`);
        }

        if (!video.originalKey) {
            throw new Error(`Video ${videoId} has no originalKey`);
        }
        // download video from s3
        const localPath = await downloadFromS3(video!.originalKey!, `${videoId}.mp4`)

        console.log("Starting transcoding...");

        // transcode video to 360p using ffmpeg and save to temp folder

        console.log(`Transcoding video ${videoId} to 360p...`);

        await transcodeVideo(
            localPath,
            `temp/${videoId}-360p.mp4`,
            640,
            360
        );

        // transcode video to 720p using ffmpeg and save to temp folder
        console.log(`Transcoding video ${videoId} to 720p...`);

        await transcodeVideo(
            localPath,
            `temp/${videoId}-720p.mp4`,
            1280,
            720
        );

        // transcode video to 1080p using ffmpeg and save to temp folder
        console.log(`Transcoding video ${videoId} to 1080p...`);

        await transcodeVideo(
            localPath,
            `temp/${videoId}-1080p.mp4`,
            1920,
            1080
        );

        console.log(
            `Transcoded video saved at ${`temp/${videoId}-360p.mp4`}, ${`temp/${videoId}-720p.mp4`}, ${`temp/${videoId}-1080p.mp4`}`
        );

        // do some processing here...
        console.log(`Downloaded video ${videoId} to ${localPath}`);
    },
    {
        connection
    }
)

console.log("Worker started...");