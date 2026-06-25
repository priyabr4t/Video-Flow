import jwt from "jsonwebtoken"

export const createAccessToken = (userId: string, role: "STUDENT" | "INSTRUCTOR" | "ADMIN") => {
    const payload = { sub: userId, role}

    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
        expiresIn: "30m"
    })

}

export const verifyAccessToken = (token: string) => {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as {
        sub: string,
        role: "STUDENT" | "INSTRUCTOR" | "ADMIN"
    }
}

export const createRefreshToken =  (userId: string) => {
    const payload = { sub: userId }

    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
        expiresIn: "7d"
    })
}

export const verifyRefreshToken =  (token : string) => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as {
        sub: string
    }
}