import type { ActionDefinition } from "@w6w/types";
import { BlobClient, blobName, containerName, json, query } from "../lib/client.ts";
import { BLOB_PARAM, CONTAINER_PARAM } from "../lib/params.ts";

/**
 * `PUT /{container}/{blob}?comp=metadata` — set a blob's custom metadata.
 *
 * ## It replaces the whole set, and an empty call clears it
 *
 * There is no merge. Sending `{"owner": "jane"}` to a blob that also had
 * `{"team": "ops"}` leaves it with only `owner`, and a call with no metadata
 * headers at all removes everything. Both succeed silently, so this action
 * reads the existing set first and reports what it removed.
 *
 * ## The names must be C# identifiers, and the case does not survive
 *
 * Metadata names have to be valid C# identifiers — letters, digits and
 * underscores, not starting with a digit. **A hyphen is rejected**, which
 * catches most names copied from anywhere else.
 *
 * And they are carried as HTTP headers, whose names are case-insensitive.
 * Azure lowercases them on the way back, so a value stored as `uploadedBy`
 * reads as `uploadedby`. Anything matching on the name has to expect that.
 *
 * ## Metadata is not encrypted separately and is not a place for secrets
 *
 * It is stored with the blob and visible to anyone who can read the blob's
 * properties — which, for a container with `blob` public access, is anyone
 * with the URL.
 */
const action: ActionDefinition = {
  key: "blob-metadata-set",
  type: "perform",
  resource: "blob",
  title: "Set blob metadata",
  description:
    "Replace a blob's custom metadata — the WHOLE set, with no merge, and an empty call clears " +
    "it. Names must be C# identifiers (a hyphen is rejected) and their case is lowercased on " +
    "the way back.",
  idempotent: true,
  params: [
    CONTAINER_PARAM,
    BLOB_PARAM,
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      required: true,
      default: "",
      hint: 'e.g. {"uploaded_by":"workflow"}. REPLACES everything; send `{}` to clear. Not a ' +
        "place for secrets — it is readable by anyone who can read the blob's properties.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "The blob" },
    { key: "metadata", type: "object", label: "What is now set" },
    { key: "removed", type: "array", label: "Names that were there and are not now" },
    { key: "etag", type: "string", label: "The new ETag" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const container = containerName(p.container);
    const blob = blobName(p.blob);

    const metadata = json(p.metadata, "metadata");
    if (metadata === undefined || typeof metadata !== "object" || Array.isArray(metadata)) {
      throw new Error("`metadata` must be an object of name/value pairs — send `{}` to clear");
    }

    const headers: Record<string, string> = {};
    for (const [name, value] of Object.entries(metadata as Record<string, unknown>)) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        throw new Error(
          `metadata name "${name}" is not a valid C# identifier — Azure requires letters, digits ` +
            "and underscores, starting with a letter or underscore. A hyphen is rejected, which " +
            "is what catches most names copied from elsewhere",
        );
      }
      headers[`x-ms-meta-${name}`] = String(value);
    }

    const client = new BlobClient(ctx);
    const path = `/${encodeURIComponent(container)}/${encodeURIComponent(blob)}`;

    // There is no merge, so what is about to disappear is worth reporting.
    const before = await client.full(path, { method: "HEAD" });
    const existing = Object.keys(before.headers)
      .filter((name) => name.startsWith("x-ms-meta-"))
      .map((name) => name.slice("x-ms-meta-".length));
    const kept = new Set(
      Object.keys(metadata as Record<string, unknown>).map((n) => n.toLowerCase()),
    );
    const removed = existing.filter((name) => !kept.has(name.toLowerCase()));

    const result = await client.full(path, {
      method: "PUT",
      query: query({ comp: "metadata" }),
      headers,
    });

    if (removed.length) {
      ctx.log("warn", "replacing this blob's metadata removed names that were set before", {
        name: blob,
        removed,
      });
    }

    return {
      name: blob,
      metadata,
      removed,
      etag: result.headers["etag"],
    };
  },
};

export default action;
