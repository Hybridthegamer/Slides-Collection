"use client";

import { useMemo, useState } from "react";
import JSZip from "jszip";

export interface SubmissionItem {
  name: string;
  topic: string;
  filename: string;
  url: string;
  size: number;
  uploadedAt: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizeForZipEntry(text: string): string {
  return text.replace(/[\\/:*?"<>|]/g, "-").trim();
}

type ZipStatus =
  | { kind: "idle" }
  | { kind: "working"; done: number; total: number }
  | { kind: "error"; message: string }
  | { kind: "done"; failed: string[] };

export default function SupervisorList({ items }: { items: SubmissionItem[] }) {
  const [query, setQuery] = useState("");
  const [zipStatus, setZipStatus] = useState<ZipStatus>({ kind: "idle" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) => item.name.toLowerCase().includes(q) || item.topic.toLowerCase().includes(q),
    );
  }, [items, query]);

  async function handleDownloadAll() {
    if (items.length === 0) return;

    setZipStatus({ kind: "working", done: 0, total: items.length });

    const zip = new JSZip();
    const failed: string[] = [];
    const usedNames = new Set<string>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const response = await fetch(item.url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = await response.arrayBuffer();

        let entryName = `${sanitizeForZipEntry(item.name)} - ${sanitizeForZipEntry(item.filename)}`;
        if (usedNames.has(entryName)) {
          entryName = `${sanitizeForZipEntry(item.name)} - ${sanitizeForZipEntry(item.filename)} (${i})`;
        }
        usedNames.add(entryName);

        zip.file(entryName, bytes);
      } catch {
        failed.push(item.name);
      }
      setZipStatus({ kind: "working", done: i + 1, total: items.length });
    }

    if (failed.length === items.length) {
      setZipStatus({ kind: "error", message: "Couldn't download any files. Please try again." });
      return;
    }

    try {
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `slides-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setZipStatus({ kind: "done", failed });
    } catch {
      setZipStatus({ kind: "error", message: "Couldn't build the zip file. Please try again." });
    }
  }

  const zipping = zipStatus.kind === "working";

  return (
    <div>
      <div className="list-toolbar">
        <input
          type="search"
          className="search-input"
          placeholder="Search by student name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {items.length > 0 && (
          <button
            type="button"
            className="download-all-button"
            onClick={handleDownloadAll}
            disabled={zipping}
          >
            {zipping ? `Zipping ${zipStatus.done}/${zipStatus.total}…` : `Download All (${items.length})`}
          </button>
        )}
      </div>

      {zipStatus.kind === "working" && (
        <div
          className="progress-track"
          role="progressbar"
          aria-valuenow={zipStatus.done}
          aria-valuemin={0}
          aria-valuemax={zipStatus.total}
        >
          <div
            className="progress-fill"
            style={{ width: `${(zipStatus.done / zipStatus.total) * 100}%` }}
          />
        </div>
      )}
      {zipStatus.kind === "error" && <p className="message message-error">{zipStatus.message}</p>}
      {zipStatus.kind === "done" && zipStatus.failed.length > 0 && (
        <p className="message message-error">
          Downloaded {items.length - zipStatus.failed.length} of {items.length} files —{" "}
          {zipStatus.failed.length} failed: {zipStatus.failed.join(", ")}
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="empty-state">No submissions yet.</p>
      ) : (
        <ul className="submission-list">
          {filtered.map((item, i) => (
            <li className="submission-card" key={i}>
              <div className="submission-info">
                <strong>{item.name}</strong>
                <span className="topic">{item.topic}</span>
                <span className="meta">
                  {item.filename} · {formatSize(item.size)} ·{" "}
                  {new Date(item.uploadedAt).toLocaleString()}
                </span>
              </div>
              <a className="download-button" href={item.url} download={item.filename}>
                Download
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
