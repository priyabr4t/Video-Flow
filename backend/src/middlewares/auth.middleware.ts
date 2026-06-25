import {NextFunction, Request, Response} from "express"
import {verifyAccessToken} from "../lib/token"
import { prisma } from "../lib/prisma"

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" })
    }

    const token = authHeader.split(" ")[1]

    try {
        const payload = verifyAccessToken(token)
        const user = await prisma.user.findUnique({ where: { id: payload.sub } })

        if (!user) {
            return res.status(401).json({ message: "User not found" })
        }

        const authReq = req as any

        authReq.user = {
            id: payload.sub,
            email: user.email,
            role: payload.role,
            name: user.name,
        }
        next()
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" })
    }
}