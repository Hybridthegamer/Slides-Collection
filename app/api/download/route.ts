import { NextResponse } from "next/server";

const ALLOWED_HOST_SUFFIX = ".public.blob.vercel-storage.com";

export async function GET(request: Request): Promise<NextResponse | Response> {
  const { searchParams } = new URL(request.url);
  const blobUrl = searchParams.get("url");
  const filename = searchParams.get("filename");

  if (!blobUrl || !filename) {
    return NextResponse.json({ error: "Missing url or filename." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(blobUrl);
  } catch {
    return NextResponse.json({ error: "Invalid url." }, { status: 400 });
  }

  // Only ever proxy our own Blob store's domain -- this route is publicly
  // reachable with no auth, so without this check it would be an open
  // proxy for arbitrary attacker-supplied URLs.
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(ALLOWED_HOST_SUFFIX)) {
    return NextResponse.json({ error: "Invalid url." }, { status: 400 });
  }

  const upstream = await fetch(parsed.toString());
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "File not found." }, { status: 502 });
  }

  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
  const headers = new Headers();
  headers.set(
    "Content-Disposition",
    `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  );
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);

  return new Response(upstream.body, { headers });
}
