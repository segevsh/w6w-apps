import type { ActionDefinition } from "@w6w/types";
import { QdrantClient } from "../lib/client.ts";
import { COLLECTION_PARAM } from "../lib/params.ts";

/**
 * `GET /collections/{name}/snapshots` — what backups exist.
 *
 * The check worth running **before** a destructive operation rather than after:
 * "is there a snapshot, and how old is it" is the question that decides whether
 * a filtered delete is recoverable.
 *
 * Qdrant does not expire snapshots. They accumulate on the node's disk until
 * somebody removes them, which is a slow way to fill a volume — so this returns
 * the total size alongside the list, because that number is the one nobody
 * looks at until the disk is full.
 */
const action: ActionDefinition = {
  key: "snapshot-list",
  type: "read",
  resource: "snapshot",
  title: "List snapshots",
  description:
    "What backups exist and how old they are — the question that decides whether a destructive " +
    "operation is recoverable. Qdrant never expires them, so the total size matters.",
  params: [COLLECTION_PARAM],
  output: [
    { key: "snapshots", type: "array", label: "Snapshots, with their sizes and times" },
    { key: "count", type: "number", label: "Snapshots kept" },
    { key: "totalBytes", type: "number", label: "Disk they occupy, which nothing reclaims" },
    { key: "latest", type: "object", label: "The most recent one" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const collection = String(p.collection ?? "").trim();
    if (!collection) throw new Error("`collection` is required");

    const snapshots = await new QdrantClient(ctx).request<
      Array<{ name?: string; size?: number; creation_time?: string }>
    >(`/collections/${encodeURIComponent(collection)}/snapshots`);
    const list = Array.isArray(snapshots) ? snapshots : [];

    const totalBytes = list.reduce((sum, s) => sum + Number(s?.size ?? 0), 0);
    // Qdrant returns them oldest first.
    const latest = list[list.length - 1];

    return { snapshots: list, count: list.length, totalBytes, latest };
  },
};

export default action;
