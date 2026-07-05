import { useState } from "react";
import { uploadVideo } from "../api/video";

export default function UploadCard() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-xl font-semibold">Upload Video</h2>

            <input
                type="file"
                accept="video/*"
                className="mt-4 block w-full text-sm"
                onChange={(e) => {
                    if (e.target.files?.length) {
                        setFile(e.target.files[0]);
                    }
                }}
            />

            {file && (
                <p className="mt-3 text-sm text-zinc-400">
                    Selected: {file.name}
                </p>
            )}

            <button
                disabled={!file || loading}
                onClick={async () => {
                    if (!file) return;

                    try {
                        setLoading(true);

                        const response = await uploadVideo(file);

                        console.log(response);

                        alert("Upload successful!");
                    } catch (error) {
                        console.error(error);

                        alert("Upload failed!");
                    } finally {
                        setLoading(false);
                    }
                }}
                className="mt-5 rounded-lg bg-blue-600 px-5 py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
            >
                {loading ? "Uploading..." : "Upload"}
            </button>
        </div>
    );
}