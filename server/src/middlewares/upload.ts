import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import multer from "multer";

import { AppError } from "#utils";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const isCloudinaryConfigured = (): boolean =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  );

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export const profileImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(
        new AppError("Only JPG, PNG and WEBP profile images are allowed", 400),
      );
      return;
    }

    callback(null, true);
  },
});

export const uploadProfileImage = async (
  file: Express.Multer.File,
): Promise<UploadApiResponse> => {
  if (!isCloudinaryConfigured()) {
    throw new AppError(
      "Profile image upload is unavailable because Cloudinary is not configured",
      503,
    );
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "karino/profile-images",
        resource_type: "image",
        unique_filename: true,
        transformation: [
          { width: 512, height: 512, crop: "fill", gravity: "face" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error || !result) {
          reject(new AppError("Profile image upload failed", 502, error));
          return;
        }

        resolve(result);
      },
    );

    stream.end(file.buffer);
  });
};

export const deleteProfileImageFromCloudinary = async (
  publicId: string,
): Promise<void> => {
  if (!isCloudinaryConfigured()) {
    return;
  }

  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
};
