import { Worker } from "bullmq";
import { connection } from "../queue/connection"
import { prisma } from "../lib/prisma";
import { downloadFromS3 } from "../storage/downloadFromS3";

const worker = new Worker(
    "video-processing",
    async (job) => {

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
        
        // download video from s3
        const localPath = await downloadFromS3(video!.s3Key, `${videoId}.mp4`)

        // do some processing here...
        console.log(`Downloaded video ${videoId} to ${localPath}`);
    },
    {
        connection
    }
)

console.log("Worker started...");