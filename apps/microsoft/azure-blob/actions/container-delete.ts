import type { ActionDefinition } from "@w6w/types";
import { BlobClient, containerName, query, readBlobList } from "../lib/client.ts";
import { CONTAINER_PARAM } from "../lib/params.ts";

/**
 * `DELETE /{container}?restype=container` — delete a container and everything
 * in it.
 *
 * ## This does not require the container to be empty
 *
 * Unlike S3 and unlike Cloud Storage, Azure deletes a container **with all its
 * blobs**, however many there are, from one call. There is no count in the
 * request and no confirmation in the response.
 *
 * That makes this the most destructive single call in the app by a wide margin,
 * and the reason it counts the blobs first and puts the number in the
 * acknowledgement. A caller who thinks the container is empty and is wrong
 * finds out here rather than afterwards.
 *
 * ## The deletion is asynchronous and the name is held
 *
 * The call returns 202 and the container is immediately gone from listings —
 * but the name cannot be reused for **at least 30 seconds**, and for a large
 * container much longer. `create` in that window is a 409
 * `ContainerBeingDeleted`, which is why a delete-then-recreate workflow needs
 * to expect it.
 *
 * ## Soft delete may or may not be on
 *
 * A container soft-delete policy makes this recoverable for a retention period.
 * It is an account-level setting this call cannot see, so the action does not
 * promise recovery either way — it says what it does not know.
 */
const action: ActionDefinition = {
  key: "container-delete",
  type: "perform",
  resource: "container",
  title: "Delete a container",
  description:
    "Delete a container AND every blob in it — Azure does not require it to be empty, unlike S3 " +
    "or Cloud Storage. The name cannot be reused for at least 30 seconds afterwards.",
  idempotent: true,
  params: [
    CONTAINER_PARAM,
    {
      key: "confirmName",
      label: "Type the container name again",
      type: "string",
      required: true,
      default: "",
      hint: "Every blob inside goes with it.",
    },
    {
      key: "acknowledgeBlobCount",
      label: "Blobs I expect it to contain",
      type: "number",
      default: 0,
      hint: "Checked against a count taken first. A container that is fuller than expected is " +
        "the case worth stopping for.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Whether the delete was accepted" },
    { key: "container", type: "string", label: "What was deleted" },
    { key: "blobsDeleted", type: "number", label: "How many blobs went with it" },
    { key: "nameHeld", type: "boolean", label: "Always true — the name is unusable for a while" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const container = containerName(p.container);
    if (String(p.confirmName ?? "").trim() !== container) {
      throw new Error(
        `\`confirmName\` must match the container name exactly — got ` +
          `"${String(p.confirmName ?? "").trim()}" for "${container}"`,
      );
    }

    const client = new BlobClient(ctx);

    // Azure will not tell us afterwards, and it does not require the container
    // to be empty — so the number has to come from before.
    const listing = await client.request(`/${encodeURIComponent(container)}`, {
      query: query({ restype: "container", comp: "list", maxresults: 5000 }),
    });
    const { blobs, nextMarker } = readBlobList(listing);
    const counted = blobs.length;
    const expected = Number(p.acknowledgeBlobCount ?? 0);

    if (nextMarker) {
      throw new Error(
        `"${container}" holds more than one page of blobs, so this action cannot put an exact ` +
          "number in front of you — and Azure would delete all of them from this one call " +
          "without requiring the container to be empty. Empty it first, or delete it through " +
          "the portal where the scale is visible",
      );
    }
    if (counted !== expected) {
      throw new Error(
        `"${container}" holds ${counted} blob(s) and \`acknowledgeBlobCount\` is ${expected}. ` +
          `Set it to ${counted} to proceed — Azure deletes a container with all its contents, ` +
          "and does not require it to be empty first",
      );
    }

    await client.request(`/${encodeURIComponent(container)}`, {
      method: "DELETE",
      query: query({ restype: "container" }),
    });

    ctx.log(
      "warn",
      "deleted an Azure container and everything in it — the name is unusable for at least 30 " +
        "seconds",
      { container, blobsDeleted: counted },
    );

    return { deleted: true, container, blobsDeleted: counted, nameHeld: true };
  },
};

export default action;
