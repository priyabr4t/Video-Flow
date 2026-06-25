import type { AppRole } from "../lib/token";

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                name: string;
                role: AppRole;
            };
        }
    }
}

export {};