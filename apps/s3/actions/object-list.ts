import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection } from "../lib/connection.ts";
import { xmlBlocks, xmlError, xmlText } from "../lib/xml.ts";

/**
 * ListObjectsV2 — `GET /<bucket>?list-type=2&...`.
 * https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html
 *
 * Paginated via `continuationToken` <-> `nextContinuationToken`: pass the
 * previous call's `nextContinuationToken` back in as `continuationToken` to
 * fetch the next page. `delimiter: "/"` groups keys under their first-level
 * "folder" into `commonPrefixes` instead of listing every key recursively —
 * S3 has no real directories, this is purely a client-side grouping of the
 * flat key namespace.
 */
interface Input {
  bucket: string;
  prefix?: string;
  delimiter?: string;
  continuationToken?: string;
  maxKeys?: number;
}

interface Output {
  objects: Array<
    { key: string; size?: number; lastModified?: string; etag?: string; storageClass?: string }
  >;
  commonPrefixes: string[];
  isTruncated: boolean;
  nextContinuationToken?: string;
  keyCount?: number;
}

const action: ActionDefinition<Input, Output> = {
  key: "object-list",
  type: "search",
  resource: "object",
  title: "List Objects",
  description: "List objects in a bucket, optionally filtered by prefix.",
  params: [
    { key: "bucket", label: "Bucket Name", type: "string", required: true },
    {
      key: "prefix",
      label: "Prefix",
      type: "string",
      hint: "Only return keys starting with this.",
    },
    {
      key: "delimiter",
      label: "Delimiter",
      type: "string",
      hint: 'Use "/" to group keys under their first path segment instead of listing recursively.',
      advanced: true,
    },
    {
      key: "continuationToken",
      label: "Continuation Token",
      type: "string",
      hint: "From a previous call's `nextContinuationToken`, to fetch the next page.",
      advanced: true,
    },
    {
      key: "maxKeys",
      label: "Max Keys",
      type: "number",
      default: 1000,
      validation: { min: 1, max: 1000, integer: true },
      advanced: true,
    },
  ],
  output: [
    { key: "objects", type: "array", label: "Objects" },
    { key: "commonPrefixes", type: "array", label: "Common prefixes" },
    { key: "isTruncated", type: "boolean", label: "More pages available" },
    { key: "nextContinuationToken", type: "string", label: "Next continuation token" },
    { key: "keyCount", type: "number", label: "Key count" },
  ],

  async execute(input, ctx) {
    if (!input.bucket) throw new Error("`bucket` is required");
    const host = hostFromConnection(ctx.connection);

    const query = new URLSearchParams({ "list-type": "2" });
    if (input.prefix) query.set("prefix", input.prefix);
    if (input.delimiter) query.set("delimiter", input.delimiter);
    if (input.continuationToken) query.set("continuation-token", input.continuationToken);
    query.set("max-keys", String(input.maxKeys ?? 1000));

    ctx.log("info", "listing S3 objects", { bucket: input.bucket, prefix: input.prefix });

    const res = await ctx.fetch(
      `https://${host}/${encodeURIComponent(input.bucket)}?${query.toString()}`,
    );
    const body = await res.text();
    if (!res.ok) {
      const err = xmlError(body);
      throw new Error(
        `ListObjectsV2 returned ${res.status}${err?.message ? `: ${err.message}` : ""}`,
      );
    }

    const objects = xmlBlocks(body, "Contents").map((c) => ({
      key: xmlText(c, "Key") ?? "",
      size: numOrUndef(xmlText(c, "Size")),
      lastModified: xmlText(c, "LastModified"),
      etag: xmlText(c, "ETag"),
      storageClass: xmlText(c, "StorageClass"),
    }));
    const commonPrefixes = xmlBlocks(body, "CommonPrefixes").map((c) => xmlText(c, "Prefix") ?? "");

    return {
      objects,
      commonPrefixes,
      isTruncated: xmlText(body, "IsTruncated") === "true",
      nextContinuationToken: xmlText(body, "NextContinuationToken"),
      keyCount: numOrUndef(xmlText(body, "KeyCount")),
    };
  },
};

function numOrUndef(s: string | undefined): number | undefined {
  if (s === undefined) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export default action;
