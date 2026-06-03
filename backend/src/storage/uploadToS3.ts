import fs from "fs";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "./s3";

export async function uploadToS3(
    filePath: string,
    key: string
) {
    const fileStream = fs.createReadStream(filePath);

    await s3.send(
        new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: key,
            Body: fileStream,
        })
    );
}