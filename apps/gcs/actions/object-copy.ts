import type { ActionDefinition } from "@w6w/types";
import { bucketName, compact, json, objectName, query, StorageClient } from "../lib/client.ts";

/**
 * `POST /b/{src}/o/{srcObj}/copyTo/b/{dst}/o/{dstObj}` — copy an object.
 *
 * ## There is no move, and no rename
 *
 * A rename is a copy followed by a delete, and so is moving something between
 * buckets. This action does the copy and offers to do the delete, so the pair
 * is one step rather than two that can half-fail — but they are still two
 * operations, and a failure between them leaves both copies. `deletedSource`
 * reports which happened.
 *
 * The same is true of "renaming a folder": there is no folder, so it is a copy
 * and delete of every object under a prefix, one at a time.
 *
 * ## Copying is server-side, and free within a location
 *
 * The bytes do not travel through the caller. Across locations there is a
 * network egress charge, and across storage classes the destination's minimum
 * duration starts fresh — copying into ARCHIVE starts a 365-day clock.
 *
 * ## A large copy may not finish in one call
 *
 * `copyTo` returns `done: false` with a `rewriteToken` for objects big enough
 * to need several passes. This action reports it rather than pretending the
 * copy completed, because the object is not there yet and the next action in a
 * workflow will not find it.
 */
const action: ActionDefinition = {
  key: "object-copy",
  type: "perform",
  resource: "object",
  title: "Copy or move an object",
  description:
    "Copy an object, optionally deleting the source — which is what a rename or a move is here, " +
    "because there is no move. A large copy can return unfinished, with a token to continue it.",
  idempotent: true,
  params: [
    {
      key: "sourceBucket",
      label: "Source Bucket",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "sourceObject",
      label: "Source Object",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "destinationBucket",
      label: "Destination Bucket",
      type: "string",
      default: "",
      hint: "Blank copies within the source bucket — which is what a rename is.",
    },
    {
      key: "destinationObject",
      label: "Destination Object",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "deleteSource",
      label: "Delete the source afterwards",
      type: "boolean",
      default: false,
      hint: "Turns the copy into a move. They are still two operations, and a failure between " +
        "them leaves both.",
    },
    {
      key: "ifGenerationMatch",
      label: "Only if the destination does not exist",
      type: "boolean",
      default: false,
      hint: "Sends `ifGenerationMatch=0`, so a copy onto an existing name fails with 412 rather " +
        "than replacing it.",
    },
    {
      key: "metadata",
      label: "Replacement Metadata",
      type: "json",
      default: "",
      advanced: true,
      hint: "Blank keeps the source's metadata.",
    },
  ],
  output: [
    { key: "object", type: "object", label: "The destination object" },
    { key: "name", type: "string", label: "Where it landed" },
    { key: "done", type: "boolean", label: "False when the copy needs continuing" },
    { key: "rewriteToken", type: "string", label: "Pass back to continue an unfinished copy" },
    { key: "deletedSource", type: "boolean", label: "Whether this was a move" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const sourceBucket = bucketName(p.sourceBucket, "sourceBucket");
    const sourceObject = objectName(p.sourceObject, "sourceObject");
    const destinationBucket = String(p.destinationBucket ?? "").trim()
      ? bucketName(p.destinationBucket, "destinationBucket")
      : sourceBucket;
    const destinationObject = objectName(p.destinationObject, "destinationObject");

    if (sourceBucket === destinationBucket && sourceObject === destinationObject) {
      throw new Error(
        "the source and destination are the same object — a copy onto itself does nothing, and " +
          "with `deleteSource` on it would delete what was just written",
      );
    }

    const client = new StorageClient(ctx);
    const result = await client.request<{
      resource?: { name?: string };
      done?: boolean;
      rewriteToken?: string;
    }>(
      `/b/${encodeURIComponent(sourceBucket)}/o/${encodeURIComponent(sourceObject)}` +
        `/copyTo/b/${encodeURIComponent(destinationBucket)}/o/${
          encodeURIComponent(destinationObject)
        }`,
      {
        method: "POST",
        query: query({ ifGenerationMatch: p.ifGenerationMatch === true ? 0 : undefined }),
        body: compact({ metadata: json(p.metadata, "metadata") }),
      },
    );

    // `copyTo` wraps the object; a big copy comes back unfinished.
    const done = result?.done !== false;
    let deletedSource = false;
    if (p.deleteSource === true) {
      if (!done) {
        throw new Error(
          "the copy did not finish in one call, so the source has NOT been deleted — continue " +
            "the copy with the rewrite token first, or the object would be lost between the two " +
            "halves of the move",
        );
      }
      await client.request(
        `/b/${encodeURIComponent(sourceBucket)}/o/${encodeURIComponent(sourceObject)}`,
        { method: "DELETE" },
      );
      deletedSource = true;
    }

    ctx.log(
      "info",
      deletedSource ? "moved a Cloud Storage object" : "copied a Cloud Storage object",
      {
        done,
        deletedSource,
      },
    );

    return {
      object: result?.resource,
      name: result?.resource?.name ?? destinationObject,
      done,
      rewriteToken: result?.rewriteToken,
      deletedSource,
    };
  },
};

export default action;
