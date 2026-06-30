import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { ALLOWED_CONTENT_TYPES, isAllowedExtension, MAX_FILE_SIZE_BYTES } from "@/lib/validation";
import { decodePathname } from "@/lib/blob-naming";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const info = decodePathname(pathname);
        if (!info) {
          console.error("upload rejected: failed to decode pathname", { pathname });
          throw new Error("Unsupported file type.");
        }
        if (!isAllowedExtension(info.filename)) {
          console.error("upload rejected: disallowed extension", {
            pathname,
            filename: info.filename,
          });
          throw new Error("Unsupported file type.");
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_FILE_SIZE_BYTES,
          addRandomSuffix: false,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("Slide upload completed:", blob.pathname);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error(
      "upload token generation failed:",
      error instanceof Error ? error.stack ?? error.message : error,
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 },
    );
  }
}
