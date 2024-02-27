export interface Album {
  uuid: string;
  name: string;
  nsfw: boolean;
  zippedAt: string;
  createdAt: string;
  editedAt: string;
  cover: string;
  count: number;
}

export interface AlbumsResponse {
  // 200
  message?: string;
  albums?: Album[];
  // 4xx / 5xx
  statusCode?: number;
  error?: string;
}

export interface CreatedAlbum {
  uuid: string;
  name: string;
  createdAt: string;
}

export interface AlbumCreationResponse {
  // 200
  message?: string;
  album?: CreatedAlbum;
  // 4xx / 5xx
  statusCode?: number;
  error?: string;
}

export interface UploadResponse {
  // 204 has no body
  // 200
  name?: string;
  uuid?: string;
  url?: string;
  // 4xx / 5xx
  statusCode?: number;
  error?: string;
  message?: string;
}
