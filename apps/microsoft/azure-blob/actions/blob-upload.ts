import type { ActionDefinition } from "@w6w/types";
import { BlobClient, blobName, containerName, json } from "../lib/client.ts";
import { BLOB_PARAM, CONTAINER_PARAM } from "../lib/params.ts";

/**
 * `PUT /{container}/{blob}` with `x-ms-blob-type: BlockBlob` — write a blob.
 *
 * ## The blob type header is required and there is no default
 *
 * Omitting `x-ms-blob-type` is a 400, and the three values are not variations
 * on a theme:
 *
 * - **BlockBlob** — ordinary files. This is what anything storing data wants.
 * - **PageBlob** — fixed-size random-access storage, for virtual machine disks.
 * - **AppendBlob** — append-only, for logs.
 *
 * A blob's type is fixed at creation and cannot be changed. Writing a BlockBlob
 * over an existing AppendBlob is a 409, not a replacement. This action writes
 * BlockBlobs and says so, rather than offering a choice that would mostly be
 * wrong.
 *
 * ## An upload overwrites, silently, and returns 201
 *
 * There is no "already exists" error by default. `ifNoneMatch: *` turns that
 * into a **412** — which is the safety working — and an `ifMatch` ETag from
 * `blob-get` is the compare-and-swap: the write lands only if nothing changed
 * in between.
 *
 * ## This is for text, and there is a size limit besides
 *
 * A single `Put Blob` call takes up to 5000 MiB, but a workflow holding that in
 * its data is a different problem from Azure's. The ceiling here is deliberately
 * low; anything larger belongs behind a SAS URL that the recipient uploads to
 * directly.
 */
const MAX_BYTES = 4_000_000;

const action: ActionDefinition = {
  key: "blob-upload",
  type: "perform",
  resource: "blob",
  title: "Upload a blob",
  description:
    "Write a block blob from text. This OVERWRITES an existing name and returns 201 — use " +
    "`ifNotExists`, or an ETag, to make a conflicting write fail with 412 instead. A blob's TYPE " +
    "is fixed at creation.",
  idempotent: true,
  params: [
    CONTAINER_PARAM,
    BLOB_PARAM,
    {
      key: "content",
      label: "Content",
      type: "string",
      required: true,
      default: "",
      hint: "Text. This action does not carry binary.",
    },
    {
      key: "contentType",
      label: "Content Type",
      type: "string",
      default: "text/plain",
      hint: "Azure serves the blob with this, so it decides what a browser does with it.",
    },
    {
      key: "ifNotExists",
      label: "Only if it does not exist",
      type: "boolean",
      default: false,
      hint: "Sends `If-None-Match: *`. A conflicting write then fails with 412 rather than " +
        "silently replacing what is there.",
    },
    {
      key: "ifMatch",
      label: "Only if unchanged since",
      type: "string",
      default: "",
      advanced: true,
      hint: "An ETag from `blob-get` — a compare-and-swap.",
    },
    {
      key: "accessTier",
      label: "Access Tier",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "", label: "The container's default" },
        { value: "Hot", label: "Hot — frequent access" },
        { value: "Cool", label: "Cool — 30-day minimum" },
        { value: "Cold", label: "Cold — 90-day minimum" },
        { value: "Archive", label: "Archive — 180-day minimum, and UNREADABLE until rehydrated" },
      ],
      hint: "Cool, Cold and Archive bill a minimum duration whether or not the blob survives.",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      default: "",
      advanced: true,
      hint: "Names must be valid C# identifiers, and their case is NOT preserved on read.",
    },
  ],
  output: [
    { key: "uploaded", type: "boolean", label: "Whether it was written" },
    { key: "name", type: "string", label: "Its name" },
    { key: "etag", type: "string", label: "The new ETag" },
    { key: "size", type: "number", label: "Bytes stored" },
    { key: "accessTier", type: "string", label: "The tier it was written to" },
    { key: "minimumDurationNote", type: "string", label: "What deleting it early costs" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const container = containerName(p.container);
    const blob = blobName(p.blob);
    const content = String(p.content ?? "");

    const size = new TextEncoder().encode(content).length;
    if (size > MAX_BYTES) {
      throw new Error(
        `this content is ${size} bytes, over the ${MAX_BYTES} ceiling this action applies. ` +
          "Moving a file through a workflow's data holds it in memory and stores it — mint a " +
          "SAS URL with `blob-sas-url` and let the sender upload to Azure directly",
      );
    }

    const ifNotExists = p.ifNotExists === true;
    const ifMatch = String(p.ifMatch ?? "").trim();
    if (ifNotExists && ifMatch) {
      throw new Error(
        "give `ifNotExists` or `ifMatch`, not both — the first means 'only if absent' and the " +
          "second means 'only if it is still this version'",
      );
    }

    const headers: Record<string, string> = {
      // Required, with no default. Omitting it is a 400.
      "x-ms-blob-type": "BlockBlob",
      "x-ms-blob-content-type": String(p.contentType ?? "text/plain").trim() || "text/plain",
    };
    if (ifNotExists) headers["if-none-match"] = "*";
    if (ifMatch) headers["if-match"] = ifMatch;

    const tier = String(p.accessTier ?? "").trim();
    if (tier) headers["x-ms-access-tier"] = tier;

    const metadata = json(p.metadata, "metadata") as Record<string, unknown> | undefined;
    for (const [name, value] of Object.entries(metadata ?? {})) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        throw new Error(
          `metadata name "${name}" is not a valid C# identifier — Azure requires letters, digits ` +
            "and underscores, starting with a letter or underscore, and rejects hyphens",
        );
      }
      headers[`x-ms-meta-${name}`] = String(value);
    }

    const result = await new BlobClient(ctx).full(
      `/${encodeURIComponent(container)}/${encodeURIComponent(blob)}`,
      {
        method: "PUT",
        headers,
        body: { content, contentType: String(p.contentType ?? "text/plain") },
      },
    );

    // The name and the size. The contents are the caller's.
    ctx.log("info", "wrote an Azure blob", { name: blob, size });

    return {
      uploaded: true,
      name: blob,
      etag: result.headers["etag"],
      size,
      accessTier: tier || undefined,
      minimumDurationNote: tierNote(tier),
    };
  },
};

/** Azure's minimum billed durations, which differ from every other vendor's. */
function tierNote(tier: string): string | undefined {
  const days: Record<string, number> = { Cool: 30, Cold: 90, Archive: 180 };
  const minimum = days[tier];
  if (!minimum) return undefined;
  return `${tier} bills a minimum of ${minimum} days per blob — deleting or re-tiering it sooner ` +
    `is still charged for the full ${minimum} days` +
    (tier === "Archive"
      ? ", and an Archive blob cannot be read at all until it is rehydrated"
      : "");
}

export default action;
