import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";

/**
 * Upload file to Cloudinary
 * @param {File} file - Express file object from multer
 * @param {String} folder - Cloudinary folder path (default: "grievance-uploads")
 * @returns {Promise} - Cloudinary upload response
 */
export const uploadFile = async (file, folder = "grievance-uploads") => {
  try {
    // Create a readable stream from the buffer for Cloudinary upload
    const stream = Readable.from(file.buffer);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          folder: folder,
          public_id: `${Date.now()}_${file.originalname
            .split(".")
            .slice(0, -1)
            .join(".")}`,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      stream.pipe(uploadStream);
    });
  } catch (error) {
    console.error("File upload error:", error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Delete file from Cloudinary
 * @param {String} publicId - Public ID of the file to delete
 * @returns {Promise} - Cloudinary delete response
 */
export const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("File delete error:", error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

export default { uploadFile, deleteFile };
