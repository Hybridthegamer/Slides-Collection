/**
 * Encodes/decodes the Vercel Blob pathname that doubles as our metadata store
 * (no database): submissions/{b64url(name)}~~{b64url(topic)}~~{b64url(filename)}~~{randomId}
 *
 * `~` is not part of the base64url alphabet, so `~~` can never appear inside an
 * encoded field, which makes splitting on it unambiguous. Encode/decode share
 * the exact same UTF-8 + base64url logic so values round-trip exactly on both
 * the browser (UploadForm) and the server (supervisor page).
 */

const PREFIX = "submissions/";
const DELIMITER = "~~";

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

export interface SubmissionInfo {
  name: string;
  topic: string;
  filename: string;
}

export function encodePathname(info: SubmissionInfo): string {
  const parts = [info.name, info.topic, info.filename].map(toBase64Url);
  return `${PREFIX}${parts.join(DELIMITER)}${DELIMITER}${randomId()}`;
}

export function decodePathname(pathname: string): SubmissionInfo | null {
  if (!pathname.startsWith(PREFIX)) return null;
  const rest = pathname.slice(PREFIX.length);
  const parts = rest.split(DELIMITER);
  if (parts.length !== 4) return null;
  try {
    const [name, topic, filename] = parts.slice(0, 3).map(fromBase64Url);
    if (!name || !topic || !filename) return null;
    return { name, topic, filename };
  } catch {
    return null;
  }
}
