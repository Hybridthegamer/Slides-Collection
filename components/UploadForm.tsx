"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { encodePathname } from "@/lib/blob-naming";
import { ALLOWED_EXTENSIONS, validateUploadForm } from "@/lib/validation";

type Status = { kind: "idle" } | { kind: "uploading" } | { kind: "error"; message: string } | { kind: "success"; filename: string; name: string; topic: string };

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

    setStatus({ kind: "uploading" });

    try {
      const pathname = encodePathname({
        name: name.trim(),
        topic: topic.trim(),
        filename: file!.name,
      });

      await upload(pathname, file!, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });

      setStatus({ kind: "success", filename: file!.name, name: name.trim(), topic: topic.trim() });
      setName("");
      setTopic("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Upload failed. Please try again.",
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
        {uploading ? "Uploading…" : "Upload"}
      </button>

      {status.kind === "error" && <p className="message message-error">{status.message}</p>}
      {status.kind === "success" && (
        <p className="message message-success">
          Uploaded &ldquo;{status.filename}&rdquo; for {status.name} — {status.topic}.
        </p>
      )}
    </form>
  );
}
