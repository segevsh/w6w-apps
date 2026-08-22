import type { ActionDefinition } from "@w6w/types";
import { QdrantClient } from "../lib/client.ts";

/**
 * `GET /collections` — what this instance holds.
 *
 * The first call in most workflows, and deliberately thin: Qdrant returns names
 * only, not sizes or configuration. Finding out how big a collection is or what
 * dimension its vectors are is `collection-get`, one per collection.
 *
 * That is worth knowing before building a dashboard that expects this call to
 * be enough — it is a directory, not a report.
 */
const action: ActionDefinition = {
  key: "collection-list",
  type: "read",
  resource: "collection",
  title: "List collections",
  description:
    "The collections in this instance — NAMES only. Sizes and vector configuration are " +
    "`collection-get`, one call per collection.",
  params: [],
  output: [
    { key: "collections", type: "array", label: "Collections" },
    { key: "names", type: "array", label: "Just the names" },
    { key: "count", type: "number", label: "Collections in the instance" },
  ],

  async execute(_input, ctx) {
    const result = await new QdrantClient(ctx).request<{ collections?: Array<{ name?: string }> }>(
      "/collections",
    );
    const collections = result?.collections ?? [];
    return {
      collections,
      names: collections.map((c) => String(c?.name ?? "")).filter(Boolean),
      count: collections.length,
    };
  },
};

export default action;
