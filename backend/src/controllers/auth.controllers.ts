import { Request, Response } from "express"
import { registerSchema } from "../schemas/auth.schema"
import { hashPassword } from "../lib/hash"
import { prisma } from "../lib/prisma";

export const registerHandler = async (req: Request, res: Response) => {
    try {
        const result = registerSchema.safeParse(req.body)

        if (!result.success) {
            return res.status(400).json({
                message: "Invalid data",
                errors: result.error.flatten()
            })
        }

        const { name, email, password } = result.data
        const normalisedEmail = email.toLowerCase().trim()
        const existingUser = await prisma.user.findUnique({ where: { email: normalisedEmail } })

        if (existingUser) {
            return res.status(409).json({
                message: "This email is already in use, please try different email"
            })
        }

        const hashedPassword = await hashPassword(password)

        const newUser = await prisma.user.create({
            data: {
                name,
                email: normalisedEmail,
                password: hashedPassword,
                role: "STUDENT",
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });

        return res.status(201).json({
            message: "User registered",
            user: newUser,
        });

    } catch (error) {
        console.error(error)
        return res.status(500).json({
            message: "Internal server error"
        })
    }
}