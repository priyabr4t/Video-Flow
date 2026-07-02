import { generateHLS } from "../services/generateHLS";

async function main() {
  try {
    await generateHLS("./temp/input.mp4", "./temp/output");

    console.log("✅ HLS generation completed.");
  } catch (err) {
    console.error(err);
  }
}

main();
