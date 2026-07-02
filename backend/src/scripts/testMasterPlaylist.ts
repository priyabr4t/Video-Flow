import path from "path";
import { HLS_VARIANTS } from "../services/generateHLSVariant";

import { generateMasterPlaylist } from "../services/generateMasterPlaylist";

const outputDir = path.join("temp", "output");

generateMasterPlaylist(outputDir, HLS_VARIANTS);

console.log("Master playlist generated!");
