import type { ActionDefinition } from "@w6w/types";
import { PlaudClient } from "../lib/client.ts";

interface PresignResponse {
  FileId?: string;
  UploadId?: string;
  ChunkSize?: number;
  Parts?: Array<{ PartNumber?: number; PresignedUrl?: string }>;
}

const action: ActionDefinition = {
  key: "upload-presign",
  type: "perform",
  resource: "file",
  title: "Start an audio upload (presigned URLs)",
  description:
    "Begin a multipart upload to Plaud storage and get one presigned S3 URL per 5 MB chunk. Uploading the chunk bytes themselves is done by the caller (PUT each chunk to its URL, no auth, and keep each ETag response header), then finish with Complete an audio upload. Optional: the Transcription API accepts any public audio URL.",
  idempotent: false,
  params: [
    {
      key: "filesize",
      label: "File size (bytes)",
      type: "number",
      required: true,
      validation: { min: 1, integer: true },
      hint: "Total size of the file; decides how many parts come back.",
    },
    {
      key: "filetype",
      label: "File type",
      type: "select",
      required: true,
      default: "mp3",
      options: [{ value: "mp3", label: "mp3" }, { value: "opus", label: "opus" }],
    },
  ],
  output: [
    { key: "fileId", type: "string", label: "File id (pass to complete-upload)" },
    { key: "uploadId", type: "string", label: "Upload id (pass to complete-upload)" },
    { key: "chunkSize", type: "number", label: "Bytes per chunk" },
    { key: "parts", type: "array", label: "[{partNumber, presignedUrl}]" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const filesize = Number(p.filesize);
    if (!Number.isInteger(filesize) || filesize < 1) {
      throw new Error("`filesize` must be a positive whole number of bytes");
    }
    const filetype = String(p.filetype ?? "mp3").trim().toLowerCase();
    if (filetype !== "mp3" && filetype !== "opus") {
      throw new Error('`filetype` must be "mp3" or "opus"');
    }
    const res = await new PlaudClient(ctx).request<PresignResponse>(
      "/open/partner/files/upload/generate-presigned-urls",
      { method: "POST", body: { filesize, filetype } },
    );
    return {
      fileId: res.FileId ?? null,
      uploadId: res.UploadId ?? null,
      chunkSize: res.ChunkSize ?? null,
      parts: (res.Parts ?? []).map((x) => ({
        partNumber: x.PartNumber ?? null,
        presignedUrl: x.PresignedUrl ?? null,
      })),
    };
  },
};

export default action;
