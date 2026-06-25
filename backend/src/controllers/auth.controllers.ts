import { Request, Response } from "express"
import { loginSchema, registerSchema } from "../schemas/auth.schema"
import { checkPassword, hashPassword } from "../lib/hash"
import { prisma } from "../lib/prisma";
import { createAccessToken, createRefreshToken } from "../lib/token";

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

export const loginHandler = async (req: Request, res: Response) => {
    try {
        const result = loginSchema.safeParse(req.body)

        if (!result.success) {
            return res.status(400).json({ message: "Invalid email id or password" })
        }

        const { email, password } = result.data

        const normalisedEmail = email.toLowerCase().trim();

        const user = await prisma.user.findUnique({ where: { email: normalisedEmail } })

        if (!user) {
            return res.status(401).json({
                message: "Invalid email id or password"
            })
        }

        const ok = await checkPassword(password, user.password)

        if (!ok) {
            return res.status(401).json({
                message: "Invalid email id or password"
            })
        }

        const accessToken = createAccessToken(user.id, user.role)

        const refreshToken = createRefreshToken(user.id)

        const isProd = process.env.NODE_ENV === 'production'

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        return res.status(200).json({
            message: 'Logged in successfully',
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        })

    } catch (error) {
        console.error(error)
        return res.status(500).json({
            message: "Internal server error"
        })
    }
}