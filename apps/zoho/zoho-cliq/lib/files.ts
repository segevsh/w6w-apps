import { base64ToBytes } from "./client.ts";

export interface FileInput {
  file: string;
  fileName?: string;
  fileMimeType?: string;
  comment?: string;
}

/**
 * Build the `multipart/form-data` body the Cliq file-share endpoints
 * document: one `file` part (the reference's samples name it `file`, although
 * its parameter table says `files`) and an optional `comments` part carrying a
 * JSON array of captions, one per file. `ctx.fetch` cannot stream from disk
 * inside the sandbox, so the file arrives as base64 and is decoded to a Blob.
 */
export function buildFileForm(input: FileInput, extra: Record<string, string | undefined> = {}) {
  const form = new FormData();
  form.append(
    "file",
    new Blob([base64ToBytes(input.file)], {
      type: input.fileMimeType || "application/octet-stream",
    }),
    input.fileName || "upload.bin",
  );
  if (input.comment) form.append("comments", JSON.stringify([input.comment]));
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined && v !== "") form.append(k, v);
  }
  return form;
}
