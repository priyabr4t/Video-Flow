import fs from "fs";
import path from "path";
import { HLSVariant } from "./generateHLSVariant";

export function generateMasterPlaylist(
  outputDir: string,
  variants: HLSVariant[],
) {
  const playlist = ["#EXTM3U", "#EXT-X-VERSION:3"];

  for (const variant of variants) {
  }
}
