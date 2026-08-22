import type { ActionDefinition } from "@w6w/types";
import { bucketName, objectName, query, StorageClient } from "../lib/client.ts";
import { BUCKET_PARAM, OBJECT_PARAM } from "../lib/params.ts";

/**
 * `GET /b/{bucket}/o/{object}?alt=media` — the object's actual bytes.
 *
 * ## `alt=media` is the whole difference
 *
 * Without it the same URL returns the **metadata JSON**. With it, the
 * contents. That is one query parameter between "the file" and "a description
 * of the file", and a workflow that forgets it gets a valid JSON object where
 * it expected a CSV — which parses, and is wrong.
 *
 * ## This is for configuration and small data
 *
 * There is a size ceiling and it is deliberately low. Objects in Cloud Storage
 * are routinely gigabytes; pulling one through a workflow's data would hold it
 * in memory, log it, and store it. For anything large the right tool is
 * `object-signed-url`, which hands out a URL that the recipient fetches
 * directly — no bytes through here at all.
 *
 * ## Text only
 *
 * The bytes are returned as a string, so this is for text: JSON, CSV, YAML,
 * logs. A binary object read this way is mangled by the decoding, and the
 * action says so rather than returning corrupted data that looks like data.
 */
const MAX_BYTES = 2_000_000;

const action: ActionDefinition = {
  key: "object-download",
  type: "read",
  resource: "object",
  title: "Download an object",
  description:
    "Read an object's contents as text — configuration and small data, not files. `alt=media` is " +
    "what separates the CONTENTS from the metadata JSON. For anything large, hand out a signed " +
    "URL instead of moving the bytes through here.",
  params: [
    BUCKET_PARAM,
    OBJECT_PARAM,
    {
      key: "generation",
      label: "Generation",
      type: "string",
      default: "",
      advanced: true,
      hint: "A specific version. Blank is the current one, which may have changed since it was " +
        "listed.",
    },
  ],
  output: [
    { key: "content", type: "string", label: "The bytes, decoded as text" },
    { key: "json", type: "object", label: "The same parsed, when it is JSON" },
    { key: "size", type: "number", label: "Bytes" },
    { key: "name", type: "string", label: "What was read" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const bucket = bucketName(p.bucket);
    const name = objectName(p.object);

    const content = await new StorageClient(ctx).request<string>(
      `/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(name)}`,
      {
        text: true,
        // Without this, the same URL returns the metadata rather than the file.
        query: query({ alt: "media", generation: p.generation }),
      },
    );

    const text = String(content ?? "");
    const size = new TextEncoder().encode(text).length;
    if (size > MAX_BYTES) {
      throw new Error(
        `this object is ${size} bytes, over the ${MAX_BYTES} ceiling this action applies. Moving ` +
          "a file through a workflow's data holds it in memory and stores it — use " +
          "`object-signed-url` and let whoever needs it fetch it directly",
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch { /* most objects are not JSON, which is not an error */ }

    // The name and the size only. The contents are the caller's.
    ctx.log("info", "read a Cloud Storage object", { name, size });

    return { content: text, json: parsed, size, name };
  },
};

export default action;
