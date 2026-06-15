import { Worker } from "bullmq";
import { connection } from "../queue/connection"
import { prisma } from "../lib/prisma";
import { downloadFromS3 } from "../storage/downloadFromS3";

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

        // do some processing here...
        console.log(`Downloaded video ${videoId} to ${localPath}`);
    },
    {
        connection
    }
)

console.log("Worker started...");