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

    //     // UPLOAD TRANSCODED VIDEOS TO S3
    //     const p360Key = `processed/${videoId}/360p.mp4`;
    //     const p720Key = `processed/${videoId}/720p.mp4`;
    //     const p1080Key = `processed/${videoId}/1080p.mp4`;

    //     console.log(`Uploading transcoded videos for video ${videoId} to S3...`);
    //     console.log(`Uploading ${p360Path} to S3 with key ${p360Key}...`);
    //     await uploadToS3(p360Path, p360Key);

    //     console.log(`Uploading ${p720Path} to S3 with key ${p720Key}...`);
    //     await uploadToS3(p720Path, p720Key);

    //     console.log(`Uploading ${p1080Path} to S3 with key ${p1080Key}...`);
    //     await uploadToS3(p1080Path, p1080Key);

    //     // STORE S3 KEYS IN DATABASE & UPDATE VIDEO STATUS TO COMPLETED
    //     console.log(`Storing S3 keys for video ${videoId} in database...`);
    //     const updatedVideo = await prisma.video.update({
    //       where: {
    //         id: videoId,
    //       },
    //       data: {
    //         p360Key: p360Key,
    //         p720Key: p720Key,
    //         p1080Key: p1080Key,
    //         status: "COMPLETED",
    //       },
    //     });

    //     console.log("DB UPDATE SUCCESSFUL");
    //     console.log(updatedVideo);

    //     // DELETE TEMP FILES
    //     console.log(`Cleaning up temporary files for video ${videoId}...`);
    //     fs.unlinkSync(localPath);
    //     fs.unlinkSync(p360Path);
    //     fs.unlinkSync(p720Path);
    //     fs.unlinkSync(p1080Path);

    //     console.log(`Video ${videoId} processed successfully.`);
    //   },
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
