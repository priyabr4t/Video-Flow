import fs from "fs";
import { Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { uploadToS3 } from "../storage/uploadToS3";
import { videoQueue } from "../queue/video.queue";

export const uploadVideo = async (
    req: Request,
    res: Response
) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded",
            });
        }
        // Create a new video record in the database
        const video = await prisma.video.create({
            data: {},
        });

        // Generate a unique S3 key for the uploaded video
        const key = `raw/${video.id}/original.mp4`;

        // Upload the video file to S3
        await uploadToS3(
            req.file.path,
            key
        );

        // Update the video record with the S3 key
        await prisma.video.update({
            where: {
                id: video.id,
            },
            data: {
                originalKey: key,
                status: "QUEUED",
            },
        });

        // Create BullMQ job
        await videoQueue.add(
            "transcode-video",
            {
                videoId: video.id,
            }
        );

        // Delete the local file after uploading to S3
        fs.unlinkSync(req.file.path);

        return res.json({
            success: true,
            videoId: video.id,
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Upload failed",
        });
    }
};