import type { ActionDefinition } from "@w6w/types";
import { BlobClient, blobName, containerName, query } from "../lib/client.ts";
import { BLOB_PARAM, CONTAINER_PARAM } from "../lib/params.ts";

/**
 * `GET /{container}/{blob}` — the blob's actual bytes.
 *
 * ## Unlike its neighbours, this URL needs no extra parameter
 *
 * S3 and Cloud Storage both distinguish "the object" from "a description of the
 * object" with a query parameter — `alt=media` in Google's case. Azure uses the
 * **method** instead: `GET` is the contents and `HEAD` is the properties, at
 * the same URL. So there is no equivalent mistake to make here, which is worth
 * knowing if you are porting from one of the others and looking for the
 * parameter.
 *
 * ## An Archive-tier blob is a 409, not a slow read
 *
 * It cannot be read at all until it is rehydrated, which takes up to 15 hours.
 * `blob-get` reports the tier without downloading anything, and is the call to
 * make first if the tier is not known.
 *
 * ## Text only, with a low ceiling
 *
 * The bytes are decoded as text, so this is for JSON, CSV, YAML and logs. A
 * binary blob read this way is mangled by the decoding. For anything large or
 * binary, `blob-sas-url` hands out a URL and the bytes never pass through here.
 */
const MAX_BYTES = 4_000_000;

const action: ActionDefinition = {
  key: "blob-download",
  type: "read",
  resource: "blob",
  title: "Download a blob",
  description:
    "Read a blob's contents as text. GET is the contents and HEAD is the properties, at the same " +
    "URL — no `alt=media` equivalent. An ARCHIVE-tier blob answers 409 rather than reading slowly.",
  params: [
    CONTAINER_PARAM,
    BLOB_PARAM,
    {
      key: "snapshot",
      label: "Snapshot",
      type: "string",
      default: "",
      advanced: true,
    },
    {
      key: "versionId",
      label: "Version ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "A specific version, with versioning on.",
    },
  ],
  output: [
    { key: "content", type: "string", label: "The bytes, decoded as text" },
    { key: "json", type: "object", label: "The same parsed, when it is JSON" },
    { key: "size", type: "number", label: "Bytes" },
    { key: "contentType", type: "string", label: "What Azure says it is" },
    { key: "etag", type: "string", label: "Pass as a precondition for a safe overwrite" },
    { key: "name", type: "string", label: "What was read" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const container = containerName(p.container);
    const blob = blobName(p.blob);

    const result = await new BlobClient(ctx).full<string>(
      `/${encodeURIComponent(container)}/${encodeURIComponent(blob)}`,
      {
        text: true,
        query: query({ snapshot: p.snapshot, versionid: p.versionId }),
      },
    );

    const content = String(result.data ?? "");
    const size = new TextEncoder().encode(content).length;
    if (size > MAX_BYTES) {
      throw new Error(
        `this blob is ${size} bytes, over the ${MAX_BYTES} ceiling this action applies. Use ` +
          "`blob-sas-url` and let whoever needs it fetch from Azure directly, rather than moving " +
          "the bytes through a workflow's data",
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch { /* most blobs are not JSON, which is not an error */ }

    // The name and the size only. The contents are the caller's.
    ctx.log("info", "read an Azure blob", { name: blob, size });

    return {
      content,
      json: parsed,
      size,
      contentType: result.headers["content-type"],
      etag: result.headers["etag"],
      name: blob,
    };
  },
};

export default action;
