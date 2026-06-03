import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "./storage/s3";
const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.get("/db-test", async (_, res) => {
  const video = await prisma.video.create({
    data: {},
  });

  res.json(video);
});

app.get("/s3-test", async (_, res) => {
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: "test.txt",
        Body: "Hello from VideoFlow",
      })
    );

    res.json({
      success: true,
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
});

export default app;