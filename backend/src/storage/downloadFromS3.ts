import fs from "fs"
import path from "path"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { s3 } from "./s3"

export async function downloadFromS3(
    key: string,
    filename: string
) {
    // Download the file from S3 using the GetObjectCommand
    const response = await s3.send(
        new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: key,
        })  
    )

    // Create a local file path to save the downloaded file
    const localPath = path.join(
        "temp",
        filename
    )

    // Create a writable stream to save the downloaded file 
    const writeStream = fs.createWriteStream(localPath)

    // Get the readable stream from the S3 response
    const body = response.Body as NodeJS.ReadableStream

    // Return a promise that resolves when the download is complete or rejects if there's an error
    await new Promise<void>((resolve, reject) => {
        // Pipe the readable stream from S3 to the writable stream to save the file locally
        body.pipe(writeStream)

        body.on("error", reject)

        writeStream.on("finish", resolve)

        writeStream.on("error", reject)
    })

    // Return the local file path of the downloaded file
    return localPath
}