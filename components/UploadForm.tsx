"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { encodePathname } from "@/lib/blob-naming";
import { ALLOWED_EXTENSIONS, validateUploadForm } from "@/lib/validation";

// Multipart chunking only helps large files (parts are >=5MB) — for small
// files it's pure overhead, adding extra round trips to Blob's storage
// endpoints that only increase the chance of a stall on a flaky connection.
const MULTIPART_THRESHOLD_BYTES = 10 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 90_000;

type Status = { kind: "idle" } | { kind: "uploading"; percentage: number } | { kind: "error"; message: string } | { kind: "success"; filename: string; name: string; topic: string };

export default function UploadForm() {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0] ?? null;

    const validationError = validateUploadForm({ name, topic, file });
    if (validationError) {
      setStatus({ kind: "error", message: validationError });
      return;
    }

    setStatus({ kind: "uploading", percentage: 0 });

    // Abort if nothing happens for a while, instead of letting the upload
    // hang forever with no feedback or way to retry. Reset on every
    // progress tick so a large-but-progressing upload isn't cut off.
    const controller = new AbortController();
    let timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
    };

    try {
      const pathname = encodePathname({
        name: name.trim(),
        topic: topic.trim(),
        filename: file!.name,
      });

      await upload(pathname, file!, {
        access: "public",
        handleUploadUrl: "/api/upload",
        multipart: file!.size > MULTIPART_THRESHOLD_BYTES,
        abortSignal: controller.signal,
        onUploadProgress: ({ percentage }) => {
          resetTimeout();
          setStatus({ kind: "uploading", percentage });
        },
      });

      clearTimeout(timeoutId);
      setStatus({ kind: "success", filename: file!.name, name: name.trim(), topic: topic.trim() });
      setName("");
      setTopic("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      clearTimeout(timeoutId);
      setStatus({
        kind: "error",
        message: controller.signal.aborted
          ? "Upload timed out. Check your connection and try again."
          : err instanceof Error
            ? err.message
            : "Upload failed. Please try again.",
      });
    }
  }

  const uploading = status.kind === "uploading";

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Your name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Jane Doe"
          disabled={uploading}
          autoComplete="name"
        />
      </label>

      <label className="field">
        <span>Presentation topic</span>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Final Year Project: ..."
          disabled={uploading}
        />
      </label>

      <label className="field">
        <span>Slides file</span>
        <input
          type="file"
          ref={fileInputRef}
          accept={ALLOWED_EXTENSIONS.join(",")}
          disabled={uploading}
        />
        <small>Accepted: {ALLOWED_EXTENSIONS.join(", ")} (max 200MB)</small>
      </label>

      <button type="submit" disabled={uploading}>
        {status.kind === "uploading" ? `Uploading… ${Math.round(status.percentage)}%` : "Upload"}
      </button>

      {status.kind === "uploading" && (
        <div className="progress-track" role="progressbar" aria-valuenow={Math.round(status.percentage)} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-fill" style={{ width: `${status.percentage}%` }} />
        </div>
      )}

      {status.kind === "error" && <p className="message message-error">{status.message}</p>}
      {status.kind === "success" && (
        <p className="message message-success">
          Uploaded &ldquo;{status.filename}&rdquo; for {status.name} — {status.topic}.
        </p>
      )}
    </form>
  );
}
