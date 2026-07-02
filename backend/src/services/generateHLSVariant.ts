import { spawn } from "child_process";
import fs from "fs";
import path from "path";

export type HLSVariant = {
  name: string;

  width: number;
  height: number;

  videoBitrate: string;
  audioBitrate: string;
  bandwidth: number;
};

export const HLS_VARIANTS: HLSVariant[] = [
  {
    name: "360p",
    width: 640,
    height: 360,
    videoBitrate: "800k",
    audioBitrate: "96k",
    bandwidth: 896000,
  },
  {
    name: "720p",
    width: 1280,
    height: 720,
    videoBitrate: "2800k",
    audioBitrate: "128k",
    bandwidth: 2928000,
  },
  {
    name: "1080p",
    width: 1920,
    height: 1080,
    videoBitrate: "5000k",
    audioBitrate: "192k",
    bandwidth: 5192000,
  },
];

export async function generateHLSVariant(
  inputPath: string,
  outputDir: string,
  variant: HLSVariant,
): Promise<void> {
  const variantDir = path.join(outputDir, variant.name);

  fs.mkdirSync(variantDir, {
    recursive: true,
  });
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",

      "-i",
      inputPath,

      "-vf",
      `scale=w=-2:h=${variant.height}:force_original_aspect_ratio=decrease:force_divisible_by=2`,

      "-c:v",
      "libx264",

      "-c:a",
      "aac",

      "-b:v",
      variant.videoBitrate,
      "-b:a",
      variant.audioBitrate,

      "-hls_time",
      "6",

      "-hls_playlist_type",
      "vod",

      "-hls_flags",
      "independent_segments",

      "-preset",
      "fast",

      "-hls_segment_filename",
      path.join(variantDir, `${variant.name}_%03d.ts`),

      path.join(variantDir, `index.m3u8`),
    ]);

    ffmpeg.stderr.on("data", (data) => {
      console.log(`[${variant.name}] ${data.toString().trim()}`);
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
