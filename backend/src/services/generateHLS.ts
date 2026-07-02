import { spawn } from "child_process";
import fs from "fs";
import path from "path";

export async function generateHLS(
  inputPath: string,
  outputDir: string,
): Promise<void> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      inputPath,

      "-vf",
      "scale=1280:720",

      "-c:v",
      "libx264",

      "-c:a",
      "aac",

      "-hls_time",
      "6",

      "-hls_playlist_type",
      "vod",

      "-hls_segment_filename",
      path.join(outputDir, "segment_%03d.ts"),

      "-y",

      path.join(outputDir, "index.m3u8"),
    ]);

    ffmpeg.stderr.on("data", (data) => {
      console.log(`[FFmpeg] ${data}`);
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    ffmpeg.on("error", reject);
  });
}
