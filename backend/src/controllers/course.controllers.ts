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

export const getCoursesHandler = async (req: Request, res: Response) => {
    try {
        const courses = await prisma.course.findMany({
            orderBy: {
                createdAt: "desc",
            },
            include: {
                instructor: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        lessons: true,
                    },
                },
            },
        });

        return res.status(200).json({
            message: "Courses fetched successfully",
            courses,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
}

export const getCourseByIdHandler = async (req: Request, res: Response) => {
    try {
        const courseId = req.params.courseId as string;
        const course = await prisma.course.findUnique({
            where: {
                id: courseId,
            },
            include: {
                instructor: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                lessons: {
                    orderBy: {
                        order: "asc",
                    },
                    include: {
                        video: {
                            select: {
                                id: true,
                                status: true,
                                p360Key: true,
                                p720Key: true,
                                p1080Key: true,
                            },
                        },
                    },
                },
            },
        });

        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }
        return res.status(200).json({
            message: "Course fetched successfully",
            course,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
}