"use client";

import { useMemo, useState } from "react";

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

export default function SupervisorList({ items }: { items: SubmissionItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) => item.name.toLowerCase().includes(q) || item.topic.toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <div>
      <input
        type="search"
        className="search-input"
        placeholder="Search by student name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

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
