export const ALLOWED_EXTENSIONS = [".pptx", ".ppt", ".pdf"] as const;

export const ALLOWED_CONTENT_TYPES = [
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/vnd.ms-powerpoint", // .ppt
  "application/pdf",
  // Browsers/OSes sometimes mislabel these; fall back to a generic type too.
  "application/octet-stream",
];

export const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024; // 30MB

export const MAX_NAME_LENGTH = 100;
export const MAX_TOPIC_LENGTH = 150;

export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

export function isAllowedExtension(filename: string): boolean {
  return ALLOWED_EXTENSIONS.includes(getExtension(filename) as (typeof ALLOWED_EXTENSIONS)[number]);
}

export interface UploadFormValidationInput {
  name: string;
  topic: string;
  file: File | null;
}

export function validateUploadForm(input: UploadFormValidationInput): string | null {
  const name = input.name.trim();
  const topic = input.topic.trim();

  if (!name) return "Please enter your name.";
  if (name.length > MAX_NAME_LENGTH) return `Name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  if (!topic) return "Please enter your presentation topic.";
  if (topic.length > MAX_TOPIC_LENGTH) return `Topic must be ${MAX_TOPIC_LENGTH} characters or fewer.`;
  if (!input.file) return "Please choose a file to upload.";
  if (!isAllowedExtension(input.file.name)) {
    return `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`;
  }
  if (input.file.size > MAX_FILE_SIZE_BYTES) {
    return `File is too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`;
  }

  return null;
}
