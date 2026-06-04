import fs from "fs";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "./s3";

// Function to upload a file to S3
export async function uploadToS3(
    filePath: string,
    key: string
) {
    // Create a readable stream from the file to be uploaded
    const fileStream = fs.createReadStream(filePath);

    // Upload the file to S3 using the PutObjectCommand
    await s3.send(
        new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: key,
            Body: fileStream,
        })
    );
}