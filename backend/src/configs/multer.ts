import multer from "multer";

// Configure multer to store uploaded files in the "uploads" directory 
export const upload = multer({
  dest: "uploads/",
});