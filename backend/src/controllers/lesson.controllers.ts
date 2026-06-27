import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { uploadToS3 } from "../storage/uploadToS3";
import { videoQueue } from "../queue/video.queue";
import fs from "fs";

export const createLessonHandler = async (
    req: Request,
    res: Response
) => {
    try {
        const courseId = req.params.courseId as string;
        const { title, order } = req.body;

        if (!req.user) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }

        if (!title || typeof title !== "string") {
            return res.status(400).json({
                message: "Lesson title is required",
            });
        }

        if (!Number.isInteger(order) || order < 1) {
            return res.status(400).json({
                message: "Order must be a positive integer",
            });
        }

        // Admin can create lessons in any course.
        // An instructor can create lessons only in their own course.
        const course = await prisma.course.findUnique({
            where: {
                id: courseId,
            },
            select: {
                id: true,
                instructorId: true,
            },
        });

        if (!course) {
            return res.status(404).json({
                message: "Course not found",
            });
        }

        const isAdmin = req.user.role === "ADMIN";
        const isOwner = course.instructorId === req.user.id;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                message: "You cannot add lessons to this course",
            });
        }

        const existingLesson = await prisma.lesson.findFirst({
            where: {
                courseId,
                order,
            },
        });

        if (existingLesson) {
            return res.status(409).json({
                message: "A lesson already exists at this order",
            });
        }

        const lesson = await prisma.lesson.create({
            data: {
                title: title.trim(),
                order,
                courseId,
            },
        });

        return res.status(201).json({
            message: "Lesson created successfully",
            lesson,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Failed to create lesson",
        });
    }
};

export const uploadLessonVideoHandler = async (req: Request, res: Response) => {
    let videoId: string | null = null;
    
    try {
        const lessonId = req.params.lessonId as string;
        if (!req.file) {
            return res.status(400).json({
                message: "No video uploaded"
            });
        }
        if (!req.user) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }

        const lesson = await prisma.lesson.findUnique({
            where: {
                id: lessonId
            },
            include: {
                course: true
            }
        });

        if (!lesson) {
            return res.status(404).json({
                message: "Lesson not found"
            });
        }

        if (
            req.user!.role !== "ADMIN" &&
            lesson.course.instructorId !== req.user!.id
        ) {
            return res.status(403).json({
                message: "You do not own this course"
            });
        }

        if (lesson.videoId) {
            return res.status(409).json({
                message: "This lesson already has a video"
            });
        }

        const video = await prisma.$transaction(async (tx) => {
            const video = await tx.video.create({
                data: {},
            });

            await tx.lesson.update({
                where: {
                    id: lessonId,
                },
                data: {
                    videoId: video.id,
                },
            });

            return video;
        });
        videoId = video.id;
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
                status: "QUEUED",
            },
        });

        await videoQueue.add(
            "transcode-video",
            {
                videoId: video.id,
            }
        );

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        return res.status(201).json({
            message: "Video uploaded successfully",
            lessonId,
            videoId: video.id,
        });


    } catch (error) {
        console.error(error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        if (videoId) {
            await prisma.video.update({
                where: { id: videoId },
                data: {
                    status: "FAILED",
                },
            }).catch(() => { });
        }
        return res.status(500).json({
            message: "Failed to upload video",
        });
    }
};

