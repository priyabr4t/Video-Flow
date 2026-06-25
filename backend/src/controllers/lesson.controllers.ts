import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

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