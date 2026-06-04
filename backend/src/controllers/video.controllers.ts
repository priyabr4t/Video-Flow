import fs from "fs";
import { Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { uploadToS3 } from "../storage/uploadToS3";

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

        const video = await prisma.video.create({
            data: {},
        });

        const key = `raw/${video.id}/original.mp4`;

        await uploadToS3(
            req.file.path,
            key
        );

        await prisma.video.update({
            where: {
                id: video.id,
            },
            data: {
                originalKey: key,
            },
        });

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