import { spawn } from "child_process";
import fs from "fs";
import path from "path";

type HLSVariant = {
  name: string;
  width: number;
  height: number;

  videoBitrate: string;
  maxBitrate: string;
  bufferSize: string;

  audioBitrate: string;
};

const variants: HLSVariant[] = [
  {
    name: "360p",
    width: 640,
    height: 360,
    videoBitrate: "800k",
    maxBitrate: "856k",
    bufferSize: "1200k",
    audioBitrate: "96k",
  },
  {
    name: "720p",
    width: 1280,
    height: 720,
    videoBitrate: "2800k",
    maxBitrate: "2996k",
    bufferSize: "4200k",
    audioBitrate: "128k",
  },
  {
    name: "1080p",
    width: 1920,
    height: 1080,
    videoBitrate: "5000k",
    maxBitrate: "5350k",
    bufferSize: "7500k",
    audioBitrate: "192k",
  },
];

export async function generateHLS(
  inputPath: string,
  outputDir: string,
): Promise<void> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const variant of variants) {
    fs.mkdirSync(path.join(outputDir, variant.name), { recursive: true });
  }

  const filterGraph = variants
    .map((variant, index) => {
      return `[v${index}]scale=w=-2:h=${variant.height}:force_original_aspect_ratio=decrease[v${index}out]`;
    })
    .join(";");

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      inputPath,

      "-filter_complex",
      filterGraph,

      "-map",
      "[v720out]",

      "-map",
      "[v360out]",

      "-map",
      "[v1080out]",

      "-map",
      "0:a",

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
