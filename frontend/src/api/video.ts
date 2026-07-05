import { api } from "./axios";

export interface Video {
  id: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  hlsMasterKey: string | null;
  createdAt: string;
}

export async function uploadVideo(file: File) {
  const formData = new FormData();

  formData.append("video", file);

  const response = await api.post("/videos/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function getAllVideos() {
  const response = await api.get("/videos");
  return response.data;
}

export async function getVideoStream(videoId: string) {
  const response = await api.get(`/videos/${videoId}/stream`);
  return response.data;
}