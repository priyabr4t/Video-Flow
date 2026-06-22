import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { s3 } from "./s3";

export async function getS3SignedUrl(
    key: string
) {
    const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: key,
    });

    return getSignedUrl(
        s3,
        command,
        {
            expiresIn: 60 * 60,
        }
    );
}