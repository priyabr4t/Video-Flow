import { Worker } from "bullmq";
import { connection } from "../queue/connection"

const worker = new Worker(
    "video-processing",
    async (job) => {
        console.log("processing-video", job.data.videoId)
    },
    {
        connection
    }
)

console.log("Worker started...");