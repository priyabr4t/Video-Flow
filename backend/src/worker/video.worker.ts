import { Worker } from "bullmq";
import { connection } from "../queue/connection";
import { prisma } from "../lib/prisma";
import { downloadFromS3 } from "../storage/downloadFromS3";
import {
  generateHLSVariant,
  HLS_VARIANTS,
} from "../services/generateHLSVariant";
import path from "path";
import { generateMasterPlaylist } from "../services/generateMasterPlaylist";
import { uploadDirectoryToS3 } from "../storage/uploadDirectoryToS3";
import fs from "fs";

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
    // TEMP DIRECTORY FOR GENERATED HLS FILES
    const outputDir = path.join("temp", videoId);

    // GENERATE ALL HLS VARIANTS (360p, 720p, 1080p)
    for (const variant of HLS_VARIANTS) {
      console.log(`Generating ${variant.name}...`);
      await generateHLSVariant(localPath, outputDir, variant);
    }
    console.log(`All HLS variants generated successfully.`);
    // GENERATE MASTER PLAYLIST
    generateMasterPlaylist(outputDir, HLS_VARIANTS);

    console.log("Master playlist generated successfully.");

    console.log("Uploading HLS package to S3...");
    // UPLOAD COMPLETE HLS PACKAGE TO S3
    await uploadDirectoryToS3(
      outputDir,
      `processed/${videoId}`
    );

    console.log("HLS package uploaded successfully.");
    // STORE MASTER PLAYLIST LOCATION IN DATABASE
    await prisma.video.update({
      where: {
        id: videoId,
      },
      data: {
        hlsMasterKey: `processed/${videoId}/master.m3u8`,
        status: "COMPLETED",
      },

    });
    // CLEAN UP LOCAL TEMP FILES
    fs.unlinkSync(localPath)

    fs.rmSync(outputDir, {
      recursive: true,
      force: true,
    })
    console.log(`Video ${videoId} processed successfully.`);

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
