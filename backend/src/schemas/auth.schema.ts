import { z } from "zod"

export const registerSchema = z.object({
    email: z.string().email(),
    password: z
        .string()
        .min(6, "Password must be at least 6 characters")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
            "Password must contain uppercase, lowercase, number and special character"
        ),
    name: z
        .string()
        .min(3, "Name must be at least 3 characters")
})

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    twoFactorCode: z.string().optional()
})