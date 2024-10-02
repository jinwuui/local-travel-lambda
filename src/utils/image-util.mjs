import sharp from "sharp";

export const resizeImage = async (imageBuffer, size) => {
  const resizeLimits = {
    t: 320,
    s: 640,
    m: 1280,
    l: 1920,
  };

  const resizeLimit = resizeLimits[size];

  if (!resizeLimit) {
    throw new Error("Invalid size specified");
  }

  const resizedImageBuffer = await sharp(imageBuffer)
    .resize({
      width: resizeLimit,
      height: resizeLimit,
      fit: sharp.fit.inside,
      withoutEnlargement: true,
    })
    .toFormat("webp")
    .toBuffer();

  return resizedImageBuffer;
};
