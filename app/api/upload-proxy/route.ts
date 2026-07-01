import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { encodePathname } from "@/lib/blob-naming";
import { isAllowedExtension, MAX_FILE_SIZE_BYTES } from "@/lib/validation";

export async function POST(request: Request): Promise<NextResponse> {
  const formData = await request.formData();
  const name = formData.get("name");
  const topic = formData.get("topic");
  const file = formData.get("file");

  if (typeof name !== "string" || typeof topic !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const trimmedName = name.trim();
  const trimmedTopic = topic.trim();

  if (!trimmedName || !trimmedTopic) {
    return NextResponse.json({ error: "Name and topic are required." }, { status: 400 });
  }
  if (!isAllowedExtension(file.name)) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "File is too large." }, { status: 400 });
  }

  const pathname = encodePathname({ name: trimmedName, topic: trimmedTopic, filename: file.name });

  try {
    await put(pathname, file, { access: "public", addRandomSuffix: false });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      "upload-proxy failed:",
      error instanceof Error ? error.stack ?? error.message : error,
    );
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
