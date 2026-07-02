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

  const filterGraph = [
    "[0:v]split=3[v360][v720][v1080]",
    "[v360]scale=w=-2:h=360:force_original_aspect_ratio=decrease[v360out]",
    "[v720]scale=w=-2:h=720:force_original_aspect_ratio=decrease[v720out]",
    "[v1080]scale=w=-2:h=1080:force_original_aspect_ratio=decrease[v1080out]",
  ].join(";");

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      inputPath,

      "-filter_complex",
      filterGraph,

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
