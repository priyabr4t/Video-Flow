import { useEffect, useState } from "react";
import UploadCard from "../components/UploadCard";
import { getAllVideos, getVideoStream, type Video } from "../api/video";
import VideoList from "../components/VideoList";
import VideoPlayer from "../components/VideoPlayer";

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [streamUrl, setStreamUrl] = useState("");
  useEffect(() => {
    async function loadVideos() {
      const data = await getAllVideos();
      setVideos(data);
    }

    loadVideos();
  }, []);
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-4xl font-bold">VideoFlow</h1>
        <p className="mt-2 text-zinc-400">
          Video Transcoding & Streaming Service
        </p>

        <div className="mt-8 space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <UploadCard />
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <VideoList
              videos={videos}
              onSelect={async (video) => {
                try {
                  setSelectedVideo(video);

                  if (video.status !== "COMPLETED") {
                    alert("Video is still processing.");
                    return;
                  }

                  const response = await getVideoStream(video.id);

                  setStreamUrl(response.streamUrl);
                } catch (error) {
                  console.error(error);
                  alert("Failed to load stream.");
                }
              }}
            />
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            {streamUrl ? (
              <VideoPlayer streamUrl={streamUrl} />
            ) : (
              <div className="flex h-80 items-center justify-center rounded-lg border border-dashed border-zinc-700 text-zinc-500">
                Select a completed video to play
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}