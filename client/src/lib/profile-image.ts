const PROFILE_IMAGE_SIZE = 512;
const TARGET_FILE_SIZE = 500 * 1024;
const SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The profile image could not be processed."));
      },
      "image/webp",
      quality,
    );
  });

export async function prepareProfileImage(file: File): Promise<File> {
  if (!SUPPORTED_TYPES.has(file.type)) {
    throw new Error("Choose a JPG, PNG, or WEBP image.");
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("Choose an image smaller than 20 MB.");
  }

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = PROFILE_IMAGE_SIZE;
  canvas.height = PROFILE_IMAGE_SIZE;
  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    throw new Error("The profile image could not be processed.");
  }

  const sourceSize = Math.min(bitmap.width, bitmap.height);
  const sourceX = (bitmap.width - sourceSize) / 2;
  const sourceY = (bitmap.height - sourceSize) / 2;
  context.drawImage(
    bitmap,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    PROFILE_IMAGE_SIZE,
    PROFILE_IMAGE_SIZE,
  );
  bitmap.close();

  let result = await canvasToBlob(canvas, 0.82);
  for (const quality of [0.72, 0.62, 0.52, 0.42, 0.32]) {
    if (result.size <= TARGET_FILE_SIZE) break;
    result = await canvasToBlob(canvas, quality);
  }

  return new File([result], "profile-image.webp", {
    type: "image/webp",
    lastModified: Date.now(),
  });
}
