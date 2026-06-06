import { Queue } from "bullmq";
import { connection } from "./connection";

export const videoQueue = new Queue(
    "video-processing",
    {
        connection,
    }
);