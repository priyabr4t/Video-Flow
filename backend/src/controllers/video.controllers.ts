import fs from "fs";
import { Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { uploadToS3 } from "../storage/uploadToS3";
import { videoQueue } from "../queue/video.queue";
import { getS3SignedUrl } from "../storage/getSignedUrl";

export const uploadVideo = async (req: Request, res: Response) => {
    try {


        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded",
            });
        }
        console.log("1. File received");

        // Create a new empty video record in the database
        const video = await prisma.video.create({
            data: {},
        });
        console.log("2. DB record created");


        // Generate an unique S3 key for the uploaded video by taking the video id from the empty record created in the db
        const key = `raw/${video.id}/original.mp4`;

        // Upload the video file to S3
        await uploadToS3(
            req.file.path,
            key
        );
        console.log("3. Uploaded to S3");

        // Update the video record in the db with the S3 key
        await prisma.video.update({
            where: {
                id: video.id,
            },
            data: {
                originalKey: key,
                status: "QUEUED",
            },
        });
        console.log("4. DB updated");

        // Create BullMQ job
        await videoQueue.add(
            "transcode-video",
            {
                videoId: video.id,
            }
        );
        console.log("5. Job queued");

        // Delete the local file after uploading to S3
        fs.unlinkSync(req.file.path);
        console.log("6. Sending response");

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

export const getVideos = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const video = await prisma.video.findUnique({
            where: {
                id: id,
            },
        });

        if (!video) {
            return res.status(404).json({
                message: "Video not found",
            });
        }
        const response = {
            ...video,
            streamUrl: video.hlsMasterKey
                ? await getS3SignedUrl(video.hlsMasterKey)
                : null,
        };

        return res.json(response);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to fetch video",
        });
    }
};

export const getVideoStream = async (
    req: Request,
    res: Response,
) => {
    const videoId = req.params.id;

    const video = await prisma.video.findUnique({
        where: {
            id: videoId as string,
        },
    });

    // CHECK IF VIDEO EXISTS
    if (!video) {
        return res.status(404).json({
            message: "Video not found",
        });
    }

    // CHECK IF VIDEO HAS FINISHED PROCESSING
    if (video.status !== "COMPLETED") {
        return res.status(400).json({
            message: "Video is still processing",
        });
    }

    // CHECK IF VIDEO HAS HLS MASTER KEY
    if (!video.hlsMasterKey) {
        return res.status(404).json({
            message: "Stream not found",
        });
    }

    // GENERATE SIGNED URL FOR HLS MASTER KEY
    const streamUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${video.hlsMasterKey}`;

    // RETURN SIGNED URL
    return res.json({
        streamUrl,
    });

}