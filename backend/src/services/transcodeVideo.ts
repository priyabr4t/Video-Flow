import { spawn } from "child_process";

export async function transcodeVideo(
    inputPath: string,
    outputPath: string,
    width: number,
    height: number,
): Promise<void> {
    return new Promise((resolve, reject) => {

        // Spawn a new FFmpeg process
        const ffmpeg = spawn("ffmpeg", [
            "-i", inputPath,               // Input file

            "-vf",                         // Video filter option
            `scale=${width}:${height}`,    // Scale video to specified width and height

            "-c:v", "libx264",       // Video codec: H.264
            "-c:a", "aac",          // Audio codec: AAC 

            "-y",                   // Overwrite output file if it exists
            outputPath              //
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