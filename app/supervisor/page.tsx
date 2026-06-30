import { list } from "@vercel/blob";
import Link from "next/link";
import { decodePathname } from "@/lib/blob-naming";
import SupervisorList, { type SubmissionItem } from "@/components/SupervisorList";

export const dynamic = "force-dynamic";

async function getSubmissions(): Promise<SubmissionItem[]> {
  const items: SubmissionItem[] = [];
  let cursor: string | undefined;

  do {
    const result = await list({ prefix: "submissions/", cursor });
    for (const blob of result.blobs) {
      const info = decodePathname(blob.pathname);
      if (!info) continue;
      items.push({
        name: info.name,
        topic: info.topic,
        filename: info.filename,
        url: blob.url,
        size: blob.size,
        uploadedAt: blob.uploadedAt.toISOString(),
      });
    }
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);

  items.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  return items;
}

export default async function SupervisorPage() {
  let items: SubmissionItem[] = [];
  let loadError: string | null = null;

  try {
    items = await getSubmissions();
  } catch {
    loadError =
      "Couldn't load submissions. If this is a fresh deployment, make sure a Blob store is connected to the Vercel project.";
  }

  return (
    <main className="page">
      <div className="container">
        <h1>Submitted Slides</h1>
        {loadError ? (
          <p className="message message-error">{loadError}</p>
        ) : (
          <>
            <p className="subtitle">{items.length} submission{items.length === 1 ? "" : "s"}</p>
            <SupervisorList items={items} />
          </>
        )}
        <p className="footer-link">
          <Link href="/">Student upload page →</Link>
        </p>
      </div>
    </main>
  );
}
