# Slides-Collection

A lightweight slide submission system for project defenses.

- **Students** go to `/` to upload their presentation slides (`.pptx`, `.ppt`, `.pdf`, up to 30MB) with their name and presentation topic — no account needed.
- **Supervisors** go to `/supervisor` to see every submission (newest first, searchable by name), download files individually or all at once, and clear everything after a defense is done.

No database — student name, topic, and original filename are encoded directly into the Vercel Blob pathname (see `lib/blob-naming.ts`), and the file list is read live from Blob storage.

## Setup

```bash
npm install
```

## Local development

```bash
npm run dev
```

The student upload page works locally, but Vercel Blob's `onUploadCompleted` callback only fires against a publicly reachable deployment — so the full upload flow should be verified on the deployed URL, not `localhost`.

## Deployment (Vercel)

1. Deploy this repo to Vercel.
2. In the Vercel dashboard, go to **Storage → Create Database → Blob** and connect the store to this project. This automatically sets the `BLOB_READ_WRITE_TOKEN` environment variable that uploads and listing depend on.
3. Share the deployed `/` URL with students and the `/supervisor` URL with supervisors.
