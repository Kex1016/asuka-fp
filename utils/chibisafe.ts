import {
  Album,
  AlbumCreationResponse,
  AlbumsResponse,
  CreatedAlbum,
  UploadResponse,
} from "@/types/chibisafe.js";

import fs from "fs";
import logging from "./logging.js";
import { ephemeralAttachmentRegex, tempDir } from "./constants.js";
import path from "path";

const apiKey: string | undefined = process.env.CHIBISAFE_API_KEY;
const baseUrl: string = "https://safe.haiiro.moe/api";

export async function getAlbums(): Promise<AlbumsResponse> {
  if (!apiKey) {
    throw new Error("CHIBISAFE_API_KEY is not set");
  }

  const response = await fetch(`${baseUrl}/albums`, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      "content-type": "application/json",
    },
  });
  return await response.json();
}

export async function createAlbum(
  name: string
): Promise<AlbumCreationResponse> {
  if (!apiKey) {
    throw new Error("CHIBISAFE_API_KEY is not set");
  }

  console.log("Creating new album");
  const response = await fetch(`${baseUrl}/album/create`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  const data: AlbumCreationResponse = await response.json();
  return data;
}

export async function uploadFile(
  chibiAlbumUuid: string,
  file: fs.PathOrFileDescriptor
): Promise<UploadResponse> {
  if (!apiKey) {
    throw new Error("CHIBISAFE_API_KEY is not set");
  }

  const formData = new FormData();
  formData.append("chibi-chunk-number", "1");
  formData.append("chibi-chunks-total", "1");
  formData.append("chibi-uuid", "f38038e2-d42b-4cd1-9deb-3b04a04d5374");

  const buf = fs.readFileSync(file);
  const blob = new Blob([buf], { type: "image/png" });
  formData.append("file", blob);

  console.log(formData);

  const response = await fetch(`${baseUrl}/upload`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "content-type": "multipart/form-data",
      albumuuid: chibiAlbumUuid,
    },
    body: formData,
  });

  console.log(response);

  const json = await response.json();
  console.log(json);

  return json;
}

// Upload images to Chibisafe
export const uploadImage = async (
  attachment: string,
  albumName: string
): Promise<
  | {
      fileUrl: string;
      fileName: string;
    }
  | undefined
> => {
  logging.log(
    logging.Severity.INFO,
    `[Chibisafe] Uploading image: ${attachment}`
  );

  const imageAttachment = ephemeralAttachmentRegex.exec(attachment);
  if (!imageAttachment) {
    logging.log(
      logging.Severity.ERROR,
      `[Chibisafe] Failed to fetch image: ${attachment}`
    );
    return undefined;
  }

  const imageBuffer = await fetch(attachment).then((res) => res.arrayBuffer());

  // write to temp
  const randomFilename = Math.random().toString(36).substring(7);

  const tempPath = path.join(
    tempDir,
    `${randomFilename}.${imageAttachment[1]}`
  );
  fs.writeFileSync(tempPath, Buffer.from(imageBuffer));

  if (!imageBuffer) {
    logging.log(
      logging.Severity.ERROR,
      `[Chibisafe] Failed to fetch image: ${attachment}`
    );
    return undefined;
  }

  const albums = await getAlbums();
  if (!albums || albums.error) {
    logging.log(
      logging.Severity.ERROR,
      `[Chibisafe] Failed to fetch albums: ${albums.error}: ${albums.message}`
    );
    return undefined;
  }

  let album: Album | CreatedAlbum | undefined = albums.albums!.find(
    (album) => album.name === albumName
  );
  if (!album) {
    const newAlbum = await createAlbum(albumName);
    if (!newAlbum || newAlbum.error) {
      logging.log(
        logging.Severity.ERROR,
        `[Chibisafe] Failed to create album: ${newAlbum.error}: ${newAlbum.message}`
      );
      return undefined;
    }

    album = newAlbum.album;

    return undefined;
  }

  const file = await uploadFile(album.uuid, tempPath);
  if (!file || file.error) {
    logging.log(
      logging.Severity.ERROR,
      `[Chibisafe] Failed to upload image: ${file.error}: ${file.message}`
    );
    return undefined;
  }

  // remove temp files
  fs.unlinkSync(tempPath);

  return { fileUrl: file.url!, fileName: file.name! };
};
