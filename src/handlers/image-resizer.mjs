import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { sdkStreamMixin } from "@aws-sdk/util-stream-node";
import { resizeImage } from "../utils/resizeImage.mjs";

const s3 = new S3Client({});

export const imageResizerHandler = async (event, context) => {
  const sizes = ["t", "s", "m", "l"]; // 추가된 사이즈 배열

  const getObjectRequests = event.Records.map(async (record) => {
    const params = {
      Bucket: record.s3.bucket.name,
      Key: record.s3.object.key,
    };

    const getObject = new GetObjectCommand(params);

    try {
      const data = await s3.send(getObject);
      const objectString = await sdkStreamMixin(data.Body).transformToString();

      // 각 사이즈에 대해 리사이징 및 업로드 수행
      await Promise.all(
        sizes.map(async (size) => {
          const resizedImageBuffer = await resizeImage(objectString, size); // 사이즈 인자를 추가
          const uploadParams = {
            Bucket: record.s3.bucket.name,
            Key: `resized/${size}/${record.s3.object.key}`, // 사이즈별로 저장할 경로
            Body: resizedImageBuffer,
          };
          const putObject = new PutObjectCommand(uploadParams);
          await s3.send(putObject);
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
