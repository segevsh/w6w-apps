import type { ActionDefinition } from "@w6w/types";
import { BlobClient, blobName, containerName, query } from "../lib/client.ts";
import { BLOB_PARAM, CONTAINER_PARAM } from "../lib/params.ts";

/**
 * `HEAD /{container}/{blob}` — a blob's properties, without its contents.
 *
 * ## The whole answer is in the headers, and the body is empty
 *
 * This is the one call in the app with nothing to parse. Size, type, ETag,
 * tier, lease state and every piece of custom metadata arrive as response
 * headers, and the body is zero bytes by design. A client that reads the body
 * concludes the blob does not exist.
 *
 * ## `x-ms-access-tier` and the rehydration trap
 *
 * A blob in the **Archive** tier cannot be read at all. Not slowly — at all:
 * `blob-download` on one is a 409, and making it readable means *rehydrating*
 * it, which takes **up to 15 hours** at standard priority and is billed. The
 * tier is not visible from a listing's name or size, so this reports it and
 * says whether the blob is currently readable.
 *
 * ## `x-ms-lease-state` is why a write might fail
 *
 * A leased blob rejects writes from anyone without the lease id, and the error
 * is a 412 that does not obviously mean "somebody else is holding this".
 *
 * ## Metadata comes back with a prefix and mangled case
 *
 * Custom metadata is returned as `x-ms-meta-{name}` headers. HTTP header names
 * are case-insensitive and Azure does not preserve the case they were set with,
 * so a value stored as `uploadedBy` reads back as `uploadedby`. This strips the
 * prefix and says so rather than pretending the case survived.
 */
const action: ActionDefinition = {
  key: "blob-get",
  type: "read",
  resource: "blob",
  title: "Get blob properties",
  description:
    "A blob's size, type, tier, lease state and metadata — all from response HEADERS, with an " +
    "empty body. An ARCHIVE-tier blob cannot be read until it is rehydrated, which takes hours.",
  params: [
    CONTAINER_PARAM,
    BLOB_PARAM,
    {
      key: "snapshot",
      label: "Snapshot",
      type: "string",
      default: "",
      advanced: true,
      hint: "A snapshot timestamp. Blank is the live blob.",
    },
    {
      key: "versionId",
      label: "Version ID",
      type: "string",
      default: "",
      advanced: true,
    },
  ],
  output: [
    { key: "exists", type: "boolean", label: "Whether the blob is there" },
    { key: "name", type: "string", label: "Its name" },
    { key: "size", type: "number", label: "Bytes, converted from the header" },
    { key: "contentType", type: "string", label: "What it claims to be" },
    { key: "etag", type: "string", label: "Pass as a precondition for a safe write" },
    { key: "lastModified", type: "string", label: "When it last changed" },
    { key: "blobType", type: "string", label: "BlockBlob, PageBlob or AppendBlob" },
    { key: "accessTier", type: "string", label: "Hot, Cool, Cold or Archive" },
    { key: "readable", type: "boolean", label: "False for an Archive blob until it is rehydrated" },
    { key: "rehydrationStatus", type: "string", label: "Present while a rehydration is running" },
    { key: "leaseState", type: "string", label: "available, leased, expired, breaking or broken" },
    { key: "metadata", type: "object", label: "Custom metadata, lowercased by HTTP" },
    { key: "headers", type: "object", label: "Every response header" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const container = containerName(p.container);
    const blob = blobName(p.blob);

    const result = await new BlobClient(ctx).full(
      // The slashes in a blob name are ordinary characters and must be encoded.
      `/${encodeURIComponent(container)}/${encodeURIComponent(blob)}`,
      {
        method: "HEAD",
        query: query({ snapshot: p.snapshot, versionid: p.versionId }),
      },
    );

    const headers = result.headers;
    const tier = headers["x-ms-access-tier"];
    // Archive is not slow, it is unreadable until rehydrated.
    const readable = tier !== "Archive";
    if (!readable) {
      ctx.log(
        "warn",
        "this blob is in the Archive tier and cannot be read until it is rehydrated, which takes " +
          "up to 15 hours",
        { container, tier },
      );
    }

    const metadata: Record<string, string> = {};
    for (const [name, value] of Object.entries(headers)) {
      // Azure does not preserve the case metadata was set with.
      if (name.startsWith("x-ms-meta-")) metadata[name.slice("x-ms-meta-".length)] = value;
    }

    return {
      exists: true,
      name: blob,
      size: Number(headers["content-length"] ?? 0),
      contentType: headers["content-type"],
      etag: headers["etag"],
      lastModified: headers["last-modified"],
      blobType: headers["x-ms-blob-type"],
      accessTier: tier,
      readable,
      rehydrationStatus: headers["x-ms-archive-status"],
      leaseState: headers["x-ms-lease-state"],
      metadata,
      headers,
    };
  },
};

export default action;
