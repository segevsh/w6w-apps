import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection, regionFromConnection } from "../lib/connection.ts";
import { xmlError } from "../lib/xml.ts";

/**
 * CreateBucket — `PUT /<bucket>`.
 * https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateBucket.html
 *
 * `us-east-1` is S3's original region and must NOT send a
 * `CreateBucketConfiguration` body (AWS treats an explicit
 * `LocationConstraint` of `us-east-1` as invalid); every other region
 * requires the body naming itself. This is a real, documented AWS quirk, not
 * an inconsistency in this action.
 *
 * Marked `idempotent: false`: re-creating a bucket you already own in
 * `us-east-1` succeeds silently, but the same call in any other region — or
 * against a name owned by someone else anywhere — fails with `409
 * BucketAlreadyOwnedByYou` / `BucketAlreadyExists`. That is not a safe
 * blanket "retry me" contract.
 */
interface Input {
  bucket: string;
  acl?: string;
}

interface Output {
  bucket: string;
  location?: string;
}

const CANNED_ACLS = [
  { value: "private", label: "Private" },
  { value: "public-read", label: "Public Read" },
  { value: "public-read-write", label: "Public Read/Write" },
  { value: "authenticated-read", label: "Authenticated Read" },
];

const action: ActionDefinition<Input, Output> = {
  key: "bucket-create",
  type: "perform",
  resource: "bucket",
  title: "Create Bucket",
  description: "Create a new S3 bucket in the connection's region.",
  idempotent: false,
  params: [
    {
      key: "bucket",
      label: "Bucket Name",
      type: "string",
      required: true,
      hint: "Globally unique across all of AWS, lowercase, 3-63 characters.",
    },
    {
      key: "acl",
      label: "Canned ACL",
      type: "select",
      default: "private",
      options: CANNED_ACLS,
      advanced: true,
    },
  ],
  output: [
    { key: "bucket", type: "string", label: "Bucket name" },
    { key: "location", type: "string", label: "Location header" },
  ],

  async execute(input, ctx) {
    if (!input.bucket) throw new Error("`bucket` is required");
    const region = regionFromConnection(ctx.connection);
    const host = hostFromConnection(ctx.connection);

    ctx.log("info", "creating S3 bucket", { bucket: input.bucket, region });

    const headers: Record<string, string> = {};
    if (input.acl) headers["x-amz-acl"] = input.acl;

    // us-east-1 is the one region that rejects an explicit LocationConstraint.
    const body = region === "us-east-1" ? undefined : `<?xml version="1.0" encoding="UTF-8"?>` +
      `<CreateBucketConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">` +
      `<LocationConstraint>${region}</LocationConstraint></CreateBucketConfiguration>`;
    if (body) headers["content-type"] = "application/xml";

    const res = await ctx.fetch(`https://${host}/${encodeURIComponent(input.bucket)}`, {
      method: "PUT",
      headers,
      body,
    });

    if (!res.ok) {
      const err = xmlError(await res.text());
      throw new Error(
        `CreateBucket returned ${res.status}${err?.message ? `: ${err.message}` : ""}`,
      );
    }

    return { bucket: input.bucket, location: res.headers.get("location") ?? undefined };
  },
};

export default action;
