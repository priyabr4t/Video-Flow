import type { Video } from "..//api/video";

type Props = {
  video: Video;
  onSelect: (video: Video) => void;
};

export default function VideoCard({ video, onSelect }: Props) {
  return (
    <div
      onClick={() => onSelect(video)}
      className="cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 p-4 hover:border-blue-500"
    >
      <p className="font-semibold">
        {video.id.slice(0, 8)}
      </p>

      <p className="mt-2 text-sm text-zinc-400">
        {video.status}
      </p>
    </div>
  );
}