import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection } from "../lib/connection.ts";
import { encodeS3Key } from "../lib/s3-path.ts";
import { base64ToBinaryString } from "../lib/base64.ts";
import { xmlError } from "../lib/xml.ts";

/**
 * PutObject — `PUT /<bucket>/<key>`, body = the object's bytes.
 * https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
 *
 * `encoding: "base64"` is only byte-exact for decoded content whose bytes
 * are all < 0x80 (see `lib/base64.ts` and `README.md` § Binary content) — a
 * limitation of the shared sandbox's string-only request body pipe, not of
 * this action. Prefer `encoding: "text"` whenever the content really is
 * text; it round-trips exactly through the same pipe because a JS string is
 * always valid UTF-16 and `TextEncoder` (used identically by the signer and
 * by the actual network call) UTF-8-encodes it consistently both times.
 *
 * `idempotent: true` — PUT replaces the object wholesale; repeating it with
 * the same input converges on the same end state.
 */
interface Input {
  bucket: string;
  key: string;
  content: string;
  encoding?: "text" | "base64";
  contentType?: string;
  acl?: string;
  metadata?: Record<string, string>;
}

interface Output {
  etag?: string;
  versionId?: string;
}

const CANNED_ACLS = [
  { value: "private", label: "Private" },
  { value: "public-read", label: "Public Read" },
  { value: "public-read-write", label: "Public Read/Write" },
  { value: "authenticated-read", label: "Authenticated Read" },
  { value: "bucket-owner-read", label: "Bucket Owner Read" },
  { value: "bucket-owner-full-control", label: "Bucket Owner Full Control" },
];

const action: ActionDefinition<Input, Output> = {
  key: "object-put",
  type: "perform",
  resource: "object",
  title: "Upload Object",
  description: "Create or overwrite an object with the given content.",
  idempotent: true,
  params: [
    { key: "bucket", label: "Bucket Name", type: "string", required: true },
    { key: "key", label: "Object Key", type: "string", required: true },
    { key: "content", label: "Content", type: "text", required: true },
    {
      key: "encoding",
      label: "Content Encoding",
      type: "select",
      default: "text",
      options: [
        { value: "text", label: "Text (UTF-8)" },
        { value: "base64", label: "Base64" },
      ],
      hint: "How to interpret `content` before uploading. See the app README for base64 limits.",
    },
    {
      key: "contentType",
      label: "Content-Type",
      type: "string",
      default: "text/plain; charset=utf-8",
    },
    { key: "acl", label: "Canned ACL", type: "select", options: CANNED_ACLS, advanced: true },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      default: {},
      hint: 'User metadata, sent as `x-amz-meta-*` headers, e.g. { "author": "james" }.',
      advanced: true,
    },
  ],
  output: [
    { key: "etag", type: "string", label: "ETag" },
    { key: "versionId", type: "string", label: "Version ID" },
  ],

  async execute(input, ctx) {
    if (!input.bucket) throw new Error("`bucket` is required");
    if (!input.key) throw new Error("`key` is required");
    if (input.content === undefined || input.content === null) {
      throw new Error("`content` is required");
    }
    const host = hostFromConnection(ctx.connection);
    const encoding = input.encoding === "base64" ? "base64" : "text";
    const body = encoding === "base64" ? base64ToBinaryString(input.content) : input.content;

    const headers: Record<string, string> = {
      "content-type": input.contentType || "application/octet-stream",
    };
    if (input.acl) headers["x-amz-acl"] = input.acl;
    for (const [k, v] of Object.entries(input.metadata ?? {})) {
      headers[`x-amz-meta-${k.toLowerCase()}`] = String(v);
    }

    ctx.log("info", "uploading S3 object", { bucket: input.bucket, key: input.key, encoding });

    const res = await ctx.fetch(
      `https://${host}/${encodeURIComponent(input.bucket)}/${encodeS3Key(input.key)}`,
      { method: "PUT", headers, body },
    );

    if (!res.ok) {
      const err = xmlError(await res.text());
      throw new Error(`PutObject returned ${res.status}${err?.message ? `: ${err.message}` : ""}`);
    }

    return {
      etag: res.headers.get("etag") ?? undefined,
      versionId: res.headers.get("x-amz-version-id") ?? undefined,
    };
  },
};

export default action;
