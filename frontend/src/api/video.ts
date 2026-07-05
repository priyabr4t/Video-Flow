import { api } from "./axios";
export interface Video {
  id: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  hlsMasterKey: string | null;
  createdAt: string;
}
export async function getAllVideos() {
  const response = await api.get("/videos");
  return response.data;
}