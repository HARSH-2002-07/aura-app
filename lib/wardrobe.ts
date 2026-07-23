import { spawn } from "child_process";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { envServer } from "./env.server";

// Ensure Cloudinary is configured
cloudinary.config({
  cloudinary_url: envServer.CLOUDINARY_URL,
});

/**
 * Removes the background from a base64 image string by delegating to a Python bridge script.
 * This runs out-of-process to completely bypass Next.js GLib/C++ segmentation faults.
 */
export async function stripBackground(base64Image: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pythonExe = "D:\\HARSH\\Fash-hit\\.venv\\Scripts\\python.exe";
    const scriptPath = path.join(process.cwd(), "lib", "bg_processor.py");

    const pythonProcess = spawn(pythonExe, [scriptPath]);
    
    let outputData = "";
    let errorData = "";

    pythonProcess.stdout.on("data", (data) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorData += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error("Python bridge failed:", errorData);
        reject(new Error("Background removal crashed: " + errorData));
      } else {
        resolve(outputData.trim());
      }
    });

    pythonProcess.on("error", (err) => {
      console.error("Failed to spawn Python process:", err);
      reject(new Error("Python execution error"));
    });

    // Write base64 image data to stdin
    pythonProcess.stdin.write(base64Image);
    pythonProcess.stdin.end();
  });
}

/**
 * Uploads a base64 data URI to Cloudinary.
 * Returns the secure URL of the uploaded image.
 */
export async function uploadToCloudinary(dataUri: string, folder: string = "wardrobe_items"): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: "image",
    });
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    throw new Error("Failed to upload image to CDN.");
  }
}
