import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const createCourseHandler = async (req: Request, res: Response) => {
    try {
        const { title, description } = req.body;

        if (!title || !description) {
            return res.status(400).json({ message: "Title and description are required" });
        }

        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const newCourse = await prisma.course.create({
            data: {
                title: title.trim(),
                description: description?.trim() || null,
                instructorId: req.user.id,
            },
        });

        return res.status(201).json({
            message: "Course created successfully",
            course: newCourse,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
}