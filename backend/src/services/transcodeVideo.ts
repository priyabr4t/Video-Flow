import { spawn } from "child_process";

export async function transcodeVideo(
    inputPath: string,
    outputPath: string
): Promise<void> {
    return new Promise((resolve, reject) => {

        // Spawn a new FFmpeg process
        const ffmpeg = spawn("ffmpeg", [
            "-i", inputPath,      // Input video file

            "-c:v", "libx264",    // Encode video using H.264
            "-c:a", "aac",        // Encode audio using AAC

            "-y",                 // Overwrite output file if it already exists
            outputPath            // Output video file
        ]);

        // FFmpeg prints progress and logs to stderr
        ffmpeg.stderr.on("data", (data) => {
            console.log(data.toString());
        });

        // Triggered when FFmpeg finishes execution
        ffmpeg.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(
                    new Error(`FFmpeg exited with code ${code}`)
                );
            }
        });

        // Triggered if FFmpeg process fails to start
        ffmpeg.on("error", reject);
    });
}