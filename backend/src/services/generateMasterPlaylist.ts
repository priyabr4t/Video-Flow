import fs from "fs";
import path from "path";
import { HLSVariant } from "./generateHLSVariant";

export function generateMasterPlaylist(
  outputDir: string,
  variants: HLSVariant[],
) {
  fs.mkdirSync(outputDir, {
    recursive: true,
  });
  const lines: string[] = ["#EXTM3U", "#EXT-X-VERSION:3", ""];
  for (const variant of variants) {
    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bandwidth},RESOLUTION=${variant.width}x${variant.height}`,
    );

    lines.push(`${variant.name}/index.m3u8`);

    lines.push("");
  }
  const masterPlaylistPath = path.join(outputDir, "master.m3u8");

  fs.writeFileSync(masterPlaylistPath, lines.join("\n"));

  console.log(`Generated master playlist at ${masterPlaylistPath}`);
}
