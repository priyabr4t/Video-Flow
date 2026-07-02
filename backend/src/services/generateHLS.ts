import { spawn } from "child_process";
import fs from "fs";

export async function generateHLS(
  inputPath: string,
  outputDir: string,
): Promise<void> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  return new Promise((resolve, reject) => {});
}
