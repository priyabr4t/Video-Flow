import fs from "fs";
import path from "path";

import { uploadToS3 } from "./uploadToS3";

export async function uploadDirectoryToS3(
    localDir: string,
    s3Prefix: string,
): Promise<void> {
    const entries = fs.readdirSync(
        localDir,
        {
            withFileTypes: true,
        }
    );

    for (const entry of entries) {
        const localPath = path.join(localDir, entry.name);
        const s3Key = `${s3Prefix}/${entry.name}`;

        if (entry.isDirectory()) {
            await uploadDirectoryToS3(
                localPath,
                s3Key
            )
        } else {
            await uploadToS3(localPath, s3Key)
        }
    }
}