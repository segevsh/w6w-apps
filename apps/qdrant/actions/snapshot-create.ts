import type { ActionDefinition } from "@w6w/types";
import { QdrantClient } from "../lib/client.ts";
import { COLLECTION_PARAM } from "../lib/params.ts";

/**
 * `POST /collections/{name}/snapshots` — take a backup of a collection.
 *
 * The only recovery this database has. There is no point-in-time restore and no
 * recycle bin, so a snapshot taken **before** a filtered delete or a re-index is
 * the difference between an undo and a re-embed.
 *
 * ## It is a snapshot of a moment, and it takes one
 *
 * Creating it copies the collection's storage, which on a large collection is
 * slow and consumes disk on the node. Qdrant stores it locally by default — so
 * a snapshot on the same volume as the data protects against a bad delete and
 * not against losing the volume. Getting it somewhere else is a separate step,
 * via the download URL.
 *
 * The sensible workflow shape is: snapshot, verify it exists, then do the
 * destructive thing.
 */
const action: ActionDefinition = {
  key: "snapshot-create",
  type: "perform",
  resource: "snapshot",
  title: "Create a snapshot",
  description:
    "Back up a collection — the only recovery this database has. Stored on the node by default, " +
    "so it protects against a bad delete rather than against losing the volume.",
  idempotent: false,
  params: [
    COLLECTION_PARAM,
    {
      key: "wait",
      label: "Wait for it to finish",
      type: "boolean",
      default: true,
      hint: "On, because a snapshot that has not finished is not a backup — and the point of " +
        "taking one is usually that something destructive comes next.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Snapshot name" },
    { key: "size", type: "number", label: "Size in bytes" },
    { key: "creation_time", type: "string", label: "When it was taken" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const collection = String(p.collection ?? "").trim();
    if (!collection) throw new Error("`collection` is required");

    const snapshot = await new QdrantClient(ctx).request<{ name?: string; size?: number }>(
      `/collections/${encodeURIComponent(collection)}/snapshots`,
      {
        method: "POST",
        query: { wait: p.wait === undefined ? true : p.wait === true },
      },
    );

    ctx.log("info", "created a Qdrant snapshot", {
      collection,
      snapshot: snapshot?.name,
      bytes: snapshot?.size,
    });
    return snapshot;
  },
};

export default action;
