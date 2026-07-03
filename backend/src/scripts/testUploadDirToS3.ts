import { uploadDirectoryToS3 } from "../storage/uploadDirectoryToS3";

async function main() {
    await uploadDirectoryToS3(
        "./temp/output",
        "processed/test-upload"
    );

    console.log("Upload completed!");
}

main().catch(console.error);