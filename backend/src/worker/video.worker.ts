import { Worker } from "bullmq";
import { connection } from "../queue/connection"
import { prisma } from "../lib/prisma";

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

        // log video
        console.log(video);
    },
    {
        connection
    }
)

console.log("Worker started...");