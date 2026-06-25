import { NextFunction, Request, Response } from "express"
import { AppRole, verifyAccessToken } from "../lib/token"
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
            return res.status(401).json({ message: "Unauthorized" })
        }

        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        };

        next()
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" })
    }
}

export const requireRole = (...allowedRoles: AppRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {

        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "You dont have the correct role to access this route" })
        }
        next()
    }
}