import type { Video } from "../api/video";
import VideoCard from "./VideoCard";

type Props = {
  videos: Video[];
  onSelect: (video: Video) => void;
};

export default function VideoList({
  videos,
  onSelect,
}: Props) {
  return (
    <div className="space-y-4">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}