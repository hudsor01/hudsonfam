"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Album {
  id: string;
  title: string;
}

interface UploadResult {
  id: string;
  thumbnailUrl: string;
  error?: string;
}

export function UploadForm({ albums }: { albums: Album[] }) {
  const [selectedAlbum, setSelectedAlbum] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setResults([]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    const uploadResults: UploadResult[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      if (selectedAlbum && selectedAlbum !== "__none__") {
        formData.append("albumId", selectedAlbum);
      }
      formData.append("title", file.name.replace(/\.[^/.]+$/, ""));

      try {
        const res = await fetch("/api/photos", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          uploadResults.push({ id: data.id, thumbnailUrl: data.thumbnailUrl });
        } else {
          const errData = await res.json().catch(() => ({ error: "Upload failed" }));
          uploadResults.push({ id: file.name, thumbnailUrl: "", error: errData.error });
        }
      } catch {
        uploadResults.push({ id: file.name, thumbnailUrl: "", error: "Network error" });
      }
    }

    setResults(uploadResults);
    setUploading(false);
    setFiles([]);

    const uploaded = uploadResults.filter((r) => !r.error).length;
    const failed = uploadResults.filter((r) => r.error).length;
    if (uploaded > 0) toast.success(`${uploaded} photo${uploaded !== 1 ? "s" : ""} uploaded`);
    if (failed > 0) toast.error(`${failed} upload${failed !== 1 ? "s" : ""} failed`);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const successCount = results.filter((r) => !r.error).length;
  const errorCount = results.filter((r) => r.error).length;

  return (
    <div className="max-w-2xl space-y-5">
      {/* Album selector */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text-muted">
          Album (optional)
        </label>
        <Select value={selectedAlbum} onValueChange={setSelectedAlbum}>
          <SelectTrigger>
            <SelectValue placeholder="No album" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No album</SelectItem>
            {albums.map((album) => (
              <SelectItem key={album.id} value={album.id}>
                {album.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* File input */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text-muted">
          Select Photos
        </label>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
          onChange={handleFileChange}
          className="block w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90 file:cursor-pointer"
        />
        {files.length > 0 && (
          <p className="text-xs text-text-dim">
            {files.length} file{files.length !== 1 ? "s" : ""} selected
          </p>
        )}
      </div>

      {/* Preview */}
      {files.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {files.map((file, i) => (
            <div
              key={i}
              className="aspect-square bg-surface border border-border rounded-lg overflow-hidden"
            >
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <Button
        onClick={handleUpload}
        disabled={files.length === 0}
        loading={uploading}
      >
        {uploading ? "Uploading..." : `Upload ${files.length || ""} Photo${files.length !== 1 ? "s" : ""}`}
      </Button>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          {successCount > 0 && (
            <div className="bg-emerald-400/10 border border-emerald-400/25 rounded-lg px-4 py-3 text-sm text-emerald-400">
              {successCount} photo{successCount !== 1 ? "s" : ""} uploaded successfully.
            </div>
          )}
          {errorCount > 0 && (
            <div className="bg-red-400/10 border border-red-400/25 rounded-lg px-4 py-3 text-sm text-red-400">
              {errorCount} upload{errorCount !== 1 ? "s" : ""} failed.
              <ul className="mt-1 list-disc pl-4">
                {results
                  .filter((r) => r.error)
                  .map((r, i) => (
                    <li key={i}>
                      {r.id}: {r.error}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {successCount > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {results
                .filter((r) => !r.error)
                .map((r) => (
                  <div
                    key={r.id}
                    className="aspect-square bg-surface border border-border rounded-lg overflow-hidden"
                  >
                    <img
                      src={r.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
            </div>
          )}

          <a
            href="/dashboard/photos"
            className="inline-block text-sm text-primary hover:text-primary/80 transition-colors"
          >
            View all photos
          </a>
        </div>
      )}
    </div>
  );
}
