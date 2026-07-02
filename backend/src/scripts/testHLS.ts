import { HLS_VARIANTS } from "../services/generateHLSVariant";
import { generateMasterPlaylist } from "../services/generateMasterPlaylist";

async function main() {
  try {
    await generateMasterPlaylist("./temp/output", HLS_VARIANTS);

    console.log("✅ HLS generation completed.");
  } catch (err) {
    console.error(err);
  }
}

main();
