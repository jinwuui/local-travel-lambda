import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import { Readable } from "stream";
import { resizeImage } from "./src/utils/image-util.mjs";

const s3 = new S3Client({ region: "ap-northeast-2" });
const supportedImageTypes = [
  "jpeg",
  "jpg",
  "png",
  "tiff",
  "gif",
  "avif",
  "webp",
];
const sizes = ["t", "s", "m", "l"];

export const handler = async (event, context) => {
  const getObjectRequests = event.Records.map(async (record) => {
    const srcBucket = record.s3.bucket.name;
    const srcKey = record.s3.object.key;

    const typeMatch = srcKey.match(/\.([^.]*)$/);
    if (!typeMatch) {
      console.log("Could not determine the image type.");
      return;
    }

    const imageType = typeMatch[1].toLowerCase();
    if (!supportedImageTypes.includes(imageType)) {
      console.log(`Unsupported image type: ${imageType}`);
      return;
    }

    try {
      const params = {
        Bucket: srcBucket,
        Key: srcKey,
      };

      const data = await s3.send(new GetObjectCommand(params));
      const stream = data.Body;

      if (stream instanceof Readable) {
        var contentBuffer = Buffer.concat(await stream.toArray());
      } else {
        throw new Error("Unknown object stream type");
      }

      await Promise.all(
        sizes.map(async (size) => {
          const resizedImageBuffer = await resizeImage(contentBuffer, size);
          const resizedImageName = record.s3.object.key
            .replace(/\.[^.]+$/, ".webp")
            .replace("images/originals/", "");

          const dstBucket = srcBucket;
          const dstKey = `images/resized/${size}/${resizedImageName}`;

          const uploadParams = {
            Bucket: dstBucket,
            Key: dstKey,
            Body: resizedImageBuffer,
          };

          await s3.send(new PutObjectCommand(uploadParams));

          console.info(`Image resized to ${size} and uploaded successfully!`);
        })
      );
    } catch (err) {
      console.error("Error processing image:", err);
    }
  });

  await Promise.all(getObjectRequests);
  console.debug("All images processed!");
};
