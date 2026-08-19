import type { ActionDefinition } from "@w6w/types";
import { BlobClient, blobName, containerName } from "../lib/client.ts";

/**
 * `PUT /{container}/{blob}` with `x-ms-copy-source` — copy a blob.
 *
 * ## The copy is asynchronous and the call does not wait
 *
 * Azure returns **202 Accepted** with an `x-ms-copy-status` of `pending` or
 * `success`, and for anything but a small blob within the same account it is
 * `pending`. The destination blob exists immediately, with the right name and
 * the right size, and **its contents are not there yet**. A workflow that
 * copies and then reads gets a blob that is only partly written.
 *
 * `x-ms-copy-id` is the handle for that copy, and the destination's own
 * properties carry the status — so `blob-get` on the destination is how you
 * find out whether it finished. This action reports both rather than implying
 * the copy is done.
 *
 * ## There is no move
 *
 * A rename is a copy and a delete. This offers the delete, and refuses to do it
 * while the copy is still pending — deleting the source of an unfinished copy
 * loses the blob, because the destination is not yet a complete copy of it.
 *
 * ## The source is a URL, which is what makes cross-account copies work
 *
 * `x-ms-copy-source` takes any URL Azure can read, so a copy can come from
 * another storage account, or from anywhere public. Within one account no
 * bytes cross the network; across accounts they do, and it is billed as egress.
 */
const action: ActionDefinition = {
  key: "blob-copy",
  type: "perform",
  resource: "blob",
  title: "Copy or move a blob",
  description:
    "Copy a blob, optionally deleting the source — which is what a rename is, because there is " +
    "no move. The copy is ASYNCHRONOUS: the destination exists immediately and its contents may " +
    "not be there yet.",
  idempotent: true,
  params: [
    {
      key: "sourceContainer",
      label: "Source Container",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "sourceBlob",
      label: "Source Blob",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "destinationContainer",
      label: "Destination Container",
      type: "string",
      default: "",
      hint: "Blank copies within the source container — which is what a rename is.",
    },
    {
      key: "destinationBlob",
      label: "Destination Blob",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "deleteSource",
      label: "Delete the source afterwards",
      type: "boolean",
      default: false,
      hint: "Turns the copy into a move. Refused while the copy is still pending, because the " +
        "destination is not yet a complete copy.",
    },
  ],
  output: [
    { key: "copyId", type: "string", label: "The copy's handle" },
    { key: "copyStatus", type: "string", label: "pending or success — 202 does not mean done" },
    { key: "done", type: "boolean", label: "False when the contents are still being written" },
    { key: "destination", type: "string", label: "Where it is landing" },
    { key: "deletedSource", type: "boolean", label: "Whether this was a move" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const sourceContainer = containerName(p.sourceContainer, "sourceContainer");
    const sourceBlob = blobName(p.sourceBlob, "sourceBlob");
    const destinationContainer = String(p.destinationContainer ?? "").trim()
      ? containerName(p.destinationContainer, "destinationContainer")
      : sourceContainer;
    const destinationBlob = blobName(p.destinationBlob, "destinationBlob");

    if (sourceContainer === destinationContainer && sourceBlob === destinationBlob) {
      throw new Error(
        "the source and destination are the same blob — a copy onto itself does nothing, and " +
          "with `deleteSource` on it would delete what was just written",
      );
    }

    const client = new BlobClient(ctx);
    const sourceUrl = `${client.host}/${encodeURIComponent(sourceContainer)}/${
      encodeURIComponent(sourceBlob)
    }`;

    const result = await client.full(
      `/${encodeURIComponent(destinationContainer)}/${encodeURIComponent(destinationBlob)}`,
      { method: "PUT", headers: { "x-ms-copy-source": sourceUrl } },
    );

    // 202 with `pending` is the normal answer for anything but a small blob.
    const copyStatus = result.headers["x-ms-copy-status"] ?? "";
    const done = copyStatus === "success";

    let deletedSource = false;
    if (p.deleteSource === true) {
      if (!done) {
        throw new Error(
          `the copy is \`${copyStatus || "pending"}\` and the source has NOT been deleted — the ` +
            "destination exists but its contents are still being written, so deleting the source " +
            "now would lose the blob. `blob-get` on the destination reports when it finishes",
        );
      }
      await client.request(
        `/${encodeURIComponent(sourceContainer)}/${encodeURIComponent(sourceBlob)}`,
        { method: "DELETE" },
      );
      deletedSource = true;
    }

    ctx.log("info", deletedSource ? "moved an Azure blob" : "copied an Azure blob", {
      copyStatus,
      done,
      deletedSource,
    });

    return {
      copyId: result.headers["x-ms-copy-id"],
      copyStatus,
      done,
      destination: destinationBlob,
      deletedSource,
    };
  },
};

export default action;
