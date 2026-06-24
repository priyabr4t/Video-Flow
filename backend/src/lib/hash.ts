import bcrypt from "bcryptjs";

export const hashPassword = async (pass: string) => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(pass, salt)

    return hash;
}

export const checkPassword = async (pass: string, hash: string) => {
    return bcrypt.compare(pass, hash)
}