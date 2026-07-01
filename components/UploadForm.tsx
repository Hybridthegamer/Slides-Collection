"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { encodePathname } from "@/lib/blob-naming";
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES, validateUploadForm } from "@/lib/validation";

// Multipart chunking only helps large files (parts are >=5MB) — for small
// files it's pure overhead, adding extra round trips to Blob's storage
// endpoints that only increase the chance of a stall on a flaky connection.
const MULTIPART_THRESHOLD_BYTES = 10 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 90_000;

// Files under this size go through our own server (/api/upload-proxy)
// instead of uploading directly to Blob's storage domain. Some
// networks/carriers can reach our app fine but stall on that separate
// storage domain, so routing small files through our own already-proven
// domain avoids that failure mode. Kept comfortably under Vercel's ~4.5MB
// serverless request body limit to leave room for form-data overhead.
const SERVER_PROXY_THRESHOLD_BYTES = 4 * 1024 * 1024;

function uploadViaProxy(params: {
  name: string;
  topic: string;
  file: File;
  onProgress: (percentage: number) => void;
  signal: AbortSignal;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload-proxy");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        params.onProgress((event.loaded / event.total) * 100);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      let message = "Upload failed. Please try again.";
      try {
        const body = JSON.parse(xhr.responseText) as { error?: string };
        if (body.error) message = body.error;
      } catch {
        // ignore parse failure, use default message
      }
      reject(new Error(message));
    };

    xhr.onerror = () => reject(new Error("Network error during upload."));
    params.signal.addEventListener("abort", () => xhr.abort());

    const formData = new FormData();
    formData.append("name", params.name);
    formData.append("topic", params.topic);
    formData.append("file", params.file);
    xhr.send(formData);
  });
}

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
      if (file!.size <= SERVER_PROXY_THRESHOLD_BYTES) {
        await uploadViaProxy({
          name: name.trim(),
          topic: topic.trim(),
          file: file!,
          signal: controller.signal,
          onProgress: (percentage) => {
            resetTimeout();
            setStatus({ kind: "uploading", percentage });
          },
        });
      } else {
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
      }

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
        <small>
          Accepted: {ALLOWED_EXTENSIONS.join(", ")} (max {MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB)
        </small>
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
