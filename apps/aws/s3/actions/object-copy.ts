import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection } from "../lib/connection.ts";
import { encodeS3Key } from "../lib/s3-path.ts";
import { xmlError, xmlText } from "../lib/xml.ts";

/**
 * CopyObject — `PUT /<destBucket>/<destKey>` with `x-amz-copy-source` naming
 * the source. Source and destination may be in different buckets but MUST be
 * in the same region this connection is signed for (S3 does not support a
 * cross-region copy in a single call).
 * https://docs.aws.amazon.com/AmazonS3/latest/API/API_CopyObject.html
 *
 * S3's well-known copy quirk: AWS can send `200 OK` and then stream an
 * `<Error>` body if the copy fails mid-stream, so a `200` status alone does
 * not guarantee success — this action checks the body for an `<Error>` tag
 * even when `res.ok`.
 */
interface Input {
  sourceBucket: string;
  sourceKey: string;
  destinationBucket: string;
  destinationKey: string;
  acl?: string;
}

interface Output {
  etag?: string;
  lastModified?: string;
}

const action: ActionDefinition<Input, Output> = {
  key: "object-copy",
  type: "perform",
  resource: "object",
  title: "Copy Object",
  description: "Copy an object to a new bucket/key, server-side.",
  idempotent: true,
  params: [
    { key: "sourceBucket", label: "Source Bucket", type: "string", required: true },
    { key: "sourceKey", label: "Source Key", type: "string", required: true },
    { key: "destinationBucket", label: "Destination Bucket", type: "string", required: true },
    { key: "destinationKey", label: "Destination Key", type: "string", required: true },
    {
      key: "acl",
      label: "Canned ACL",
      type: "select",
      options: [
        { value: "private", label: "Private" },
        { value: "public-read", label: "Public Read" },
        { value: "bucket-owner-full-control", label: "Bucket Owner Full Control" },
      ],
      advanced: true,
    },
  ],
  output: [
    { key: "etag", type: "string", label: "ETag" },
    { key: "lastModified", type: "string", label: "Last-Modified" },
  ],

  async execute(input, ctx) {
    for (
      const field of ["sourceBucket", "sourceKey", "destinationBucket", "destinationKey"] as const
    ) {
      if (!input[field]) throw new Error(`\`${field}\` is required`);
    }
    const host = hostFromConnection(ctx.connection);
    const copySource = `/${encodeURIComponent(input.sourceBucket)}/${encodeS3Key(input.sourceKey)}`;

    const headers: Record<string, string> = { "x-amz-copy-source": copySource };
    if (input.acl) headers["x-amz-acl"] = input.acl;

    ctx.log("info", "copying S3 object", {
      from: `${input.sourceBucket}/${input.sourceKey}`,
      to: `${input.destinationBucket}/${input.destinationKey}`,
    });

    const res = await ctx.fetch(
      `https://${host}/${encodeURIComponent(input.destinationBucket)}/${
        encodeS3Key(input.destinationKey)
      }`,
      { method: "PUT", headers },
    );

    const body = await res.text();
    const err = xmlError(body);
    if (!res.ok || err) {
      throw new Error(`CopyObject returned ${res.status}${err?.message ? `: ${err.message}` : ""}`);
    }

    return {
      etag: xmlText(body, "ETag"),
      lastModified: xmlText(body, "LastModified"),
    };
  },
};

export default action;
