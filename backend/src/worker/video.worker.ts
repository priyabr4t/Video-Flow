import { Worker } from "bullmq";
import { connection } from "../queue/connection";
import { prisma } from "../lib/prisma";
import { downloadFromS3 } from "../storage/downloadFromS3";
import { uploadToS3 } from "../storage/uploadToS3";
import fs from "fs";
import {
  generateHLSVariant,
  HLS_VARIANTS,
} from "../services/generateHLSVariant";
import path from "path";
import { generateMasterPlaylist } from "../services/generateMasterPlaylist";
import "dotenv/config";
import { uploadDirectoryToS3 } from "../storage/uploadDirectoryToS3";
console.log(process.env.AWS_REGION);
const worker = new Worker(
  "video-processing",
  async (job) => {
    console.log("Job received:", job.id);
    console.log("Video ID:", job.data.videoId);

    // GET VIDEO ID FROM JOB DATA
    const videoId = job.data.videoId;

    // GET VIDEO FROM DATABASE
    const video = await prisma.video.findUnique({
      where: {
        id: videoId,
      },
    });

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
        status: "PROCESSING",
      },
    });

    // DOWNLOAD VIDEO FROM S3 TO TEMP FOLDER
    const localPath = await downloadFromS3(
      video!.originalKey!,
      `${videoId}.mp4`,
    );
    console.log("Starting HLS generation...");

    const outputDir = path.join("temp", videoId);

    console.log(`Generating HLS variants...`);

    for (const variant of HLS_VARIANTS) {
      console.log(`Generating ${variant.name}...`);
      await generateHLSVariant(localPath, outputDir, variant);
    }
    console.log(`All HLS variants generated successfully.`);

    generateMasterPlaylist(outputDir, HLS_VARIANTS);

    console.log("Master playlist generated successfully.");

    console.log("Uploading HLS package to S3...");

    await uploadDirectoryToS3(
      outputDir,
      `processed/${videoId}`
    );

    console.log("HLS package uploaded successfully.");
  },
  {
    connection,
  },
);

console.log("Worker started...");

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed`);
  console.error(err);
});
