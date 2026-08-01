import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection } from "../lib/connection.ts";
import { encodeS3Key } from "../lib/s3-path.ts";

/**
 * HeadObject — `HEAD /<bucket>/<key>`. Returns the same metadata headers as
 * GetObject without transferring the body — the cheap way to check
 * existence/size/type. https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadObject.html
 *
 * S3 never sends a body on a HEAD response (not even an `<Error>` on
 * failure — that's HTTP semantics, not an S3 quirk), so a 404 here reports
 * only the status; there is no XML message to surface.
 */
interface Input {
  bucket: string;
  key: string;
  versionId?: string;
}

interface Output {
  exists: boolean;
  contentType?: string;
  contentLength?: number;
  etag?: string;
  lastModified?: string;
}

const action: ActionDefinition<Input, Output> = {
  key: "object-head",
  type: "read",
  resource: "object",
  title: "Get Object Metadata",
  description: "Check whether an object exists and read its metadata without downloading it.",
  params: [
    { key: "bucket", label: "Bucket Name", type: "string", required: true },
    { key: "key", label: "Object Key", type: "string", required: true },
    { key: "versionId", label: "Version ID", type: "string", advanced: true },
  ],
  output: [
    { key: "exists", type: "boolean", label: "Exists" },
    { key: "contentType", type: "string", label: "Content-Type" },
    { key: "contentLength", type: "number", label: "Content-Length" },
    { key: "etag", type: "string", label: "ETag" },
    { key: "lastModified", type: "string", label: "Last-Modified" },
  ],

  async execute(input, ctx) {
    if (!input.bucket) throw new Error("`bucket` is required");
    if (!input.key) throw new Error("`key` is required");
    const host = hostFromConnection(ctx.connection);
    const query = input.versionId ? `?versionId=${encodeURIComponent(input.versionId)}` : "";

    ctx.log("info", "checking S3 object metadata", { bucket: input.bucket, key: input.key });

    const res = await ctx.fetch(
      `https://${host}/${encodeURIComponent(input.bucket)}/${encodeS3Key(input.key)}${query}`,
      { method: "HEAD" },
    );

    if (res.status === 404) return { exists: false };
    if (!res.ok) throw new Error(`HeadObject returned ${res.status}`);

    return {
      exists: true,
      contentType: res.headers.get("content-type") ?? undefined,
      contentLength: numOrUndef(res.headers.get("content-length")),
      etag: res.headers.get("etag") ?? undefined,
      lastModified: res.headers.get("last-modified") ?? undefined,
    };
  },
};

function numOrUndef(s: string | null): number | undefined {
  if (s === null) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export default action;
