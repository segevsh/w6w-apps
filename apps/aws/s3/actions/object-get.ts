import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection } from "../lib/connection.ts";
import { encodeS3Key } from "../lib/s3-path.ts";
import { bytesToBase64 } from "../lib/base64.ts";
import { xmlError } from "../lib/xml.ts";

/**
 * GetObject — `GET /<bucket>/<key>`.
 * https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
 *
 * `encoding: "base64"` reads the response as raw bytes and base64-encodes
 * them — this direction is exact (the sandbox's fetch response carries the
 * real bytes through unmodified; see `README.md` § Binary content). Use it
 * for anything that isn't valid UTF-8 text (images, PDFs, archives).
 */
interface Input {
  bucket: string;
  key: string;
  versionId?: string;
  encoding?: "text" | "base64";
}

interface Output {
  content: string;
  encoding: "text" | "base64";
  contentType?: string;
  contentLength?: number;
  etag?: string;
  lastModified?: string;
}

const action: ActionDefinition<Input, Output> = {
  key: "object-get",
  type: "read",
  resource: "object",
  title: "Get Object",
  description: "Download an object's content and metadata.",
  params: [
    { key: "bucket", label: "Bucket Name", type: "string", required: true },
    { key: "key", label: "Object Key", type: "string", required: true },
    { key: "versionId", label: "Version ID", type: "string", advanced: true },
    {
      key: "encoding",
      label: "Content Encoding",
      type: "select",
      default: "text",
      options: [
        { value: "text", label: "Text (UTF-8)" },
        { value: "base64", label: "Base64 (binary-safe)" },
      ],
    },
  ],
  output: [
    { key: "content", type: "string", label: "Content" },
    { key: "encoding", type: "string", label: "Content encoding" },
    { key: "contentType", type: "string", label: "Content-Type" },
    { key: "contentLength", type: "number", label: "Content-Length" },
    { key: "etag", type: "string", label: "ETag" },
    { key: "lastModified", type: "string", label: "Last-Modified" },
  ],

  async execute(input, ctx) {
    if (!input.bucket) throw new Error("`bucket` is required");
    if (!input.key) throw new Error("`key` is required");
    const host = hostFromConnection(ctx.connection);
    const encoding = input.encoding === "base64" ? "base64" : "text";

    const query = input.versionId ? `?versionId=${encodeURIComponent(input.versionId)}` : "";
    const url = `https://${host}/${encodeURIComponent(input.bucket)}/${
      encodeS3Key(input.key)
    }${query}`;

    ctx.log("info", "getting S3 object", { bucket: input.bucket, key: input.key, encoding });

    const res = await ctx.fetch(url);
    if (!res.ok) {
      const err = xmlError(await res.text());
      throw new Error(`GetObject returned ${res.status}${err?.message ? `: ${err.message}` : ""}`);
    }

    const content = encoding === "base64"
      ? bytesToBase64(new Uint8Array(await res.arrayBuffer()))
      : await res.text();

    return {
      content,
      encoding,
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
