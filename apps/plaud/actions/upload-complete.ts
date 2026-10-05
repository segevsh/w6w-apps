import type { ActionDefinition } from "@w6w/types";
import { compact, PlaudClient, requireString } from "../lib/client.ts";

interface CompleteResponse {
  FileId?: string;
  FileType?: string;
  DownloadUrl?: string;
  FileMd5?: string;
}

/** Accept the parts as JSON text or an array, with either PascalCase or camelCase keys. */
function parts(value: unknown): Array<{ PartNumber: number; ETag: string }> {
  let v = value;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      throw new Error("`parts` is not valid JSON");
    }
  }
  if (!Array.isArray(v) || v.length === 0) {
    throw new Error("`parts` must be a non-empty array of {PartNumber, ETag}");
  }
  return v.map((raw, i) => {
    const o = (raw ?? {}) as Record<string, unknown>;
    const n = Number(o.PartNumber ?? o.partNumber);
    const etag = String(o.ETag ?? o.etag ?? o.eTag ?? "");
    if (!Number.isInteger(n) || n < 1 || !etag) {
      throw new Error(`\`parts[${i}]\` needs a 1-based PartNumber and the ETag from its PUT`);
    }
    return { PartNumber: n, ETag: etag };
  });
}

const action: ActionDefinition = {
  key: "upload-complete",
  type: "perform",
  resource: "file",
  title: "Complete an audio upload",
  description:
    "Merge the uploaded parts into one file and get its download URL (valid about 24 hours), which can be passed to Submit audio for transcription.",
  idempotent: false,
  params: [
    { key: "fileId", label: "File id", type: "string", required: true },
    { key: "uploadId", label: "Upload id", type: "string", required: true },
    {
      key: "parts",
      label: "Parts",
      type: "json",
      required: true,
      hint:
        'Array of {"PartNumber": 1, "ETag": "\\"abc…\\""}, one per chunk, ETag taken from the S3 PUT response header.',
    },
    {
      key: "filetype",
      label: "File type",
      type: "select",
      required: true,
      default: "mp3",
      options: [{ value: "mp3", label: "mp3" }, { value: "opus", label: "opus" }],
    },
    {
      key: "md5",
      label: "File MD5 (optional)",
      type: "string",
      hint: "Hex MD5 of the full file, used for an integrity check.",
    },
  ],
  output: [
    { key: "fileId", type: "string", label: "File id" },
    { key: "fileType", type: "string", label: "File type" },
    { key: "downloadUrl", type: "string", label: "Presigned download URL (~24h)" },
    { key: "md5", type: "string", label: "MD5 of the merged file" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const body = compact({
      file_id: requireString(p.fileId, "fileId"),
      upload_id: requireString(p.uploadId, "uploadId"),
      part_list: parts(p.parts),
      filetype: String(p.filetype ?? "mp3").trim().toLowerCase(),
      file_md5: p.md5 === undefined ? undefined : String(p.md5).trim(),
    });
    const res = await new PlaudClient(ctx).request<CompleteResponse>(
      "/open/partner/files/upload/complete-upload",
      { method: "POST", body },
    );
    return {
      fileId: res.FileId ?? null,
      fileType: res.FileType ?? null,
      downloadUrl: res.DownloadUrl ?? null,
      md5: res.FileMd5 ?? null,
    };
  },
};

export default action;
