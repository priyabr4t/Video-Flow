import UploadCard from "../components/UploadCard";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-4xl font-bold">VideoFlow</h1>
        <p className="mt-2 text-zinc-400">
          Video Transcoding & Streaming Service
        </p>

        <div className="mt-8 space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
           <UploadCard/>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            Video List
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            Video Player
          </div>
        </div>
      </div>
    </div>
  );
}