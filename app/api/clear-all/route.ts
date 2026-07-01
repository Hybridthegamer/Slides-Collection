import { list, del } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  const configuredSecret = process.env.SUPERVISOR_SECRET;
  if (!configuredSecret) {
    return NextResponse.json(
      {
        error:
          "Clear-all is not configured. Set the SUPERVISOR_SECRET environment variable in the Vercel project.",
      },
      { status: 501 },
    );
  }

  const providedSecret = request.headers.get("x-supervisor-secret");
  if (providedSecret !== configuredSecret) {
    return NextResponse.json({ error: "Incorrect secret." }, { status: 403 });
  }

  try {
    const urls: string[] = [];
    let cursor: string | undefined;

    do {
      const result = await list({ prefix: "submissions/", cursor });
      urls.push(...result.blobs.map((blob) => blob.url));
      cursor = result.hasMore ? result.cursor : undefined;
    } while (cursor);

    if (urls.length > 0) {
      await del(urls);
    }

    return NextResponse.json({ deleted: urls.length });
  } catch (error) {
    console.error(
      "clear-all failed:",
      error instanceof Error ? error.stack ?? error.message : error,
    );
    return NextResponse.json({ error: "Failed to clear submissions." }, { status: 500 });
  }
}
