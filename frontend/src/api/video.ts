import { api } from "./axios";

export async function uploadVideo(file: File) {
  const formData = new FormData();

  formData.append("video", file);

  const response = await api.post(
    "/videos/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}