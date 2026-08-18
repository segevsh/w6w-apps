import type { ActionDefinition } from "@w6w/types";
import { QdrantClient } from "../lib/client.ts";

/**
 * `GET /aliases` — the names pointing at collections.
 *
 * An alias is a second name for a collection, and it is the mechanism behind
 * zero-downtime re-indexing: build `documents_v2` alongside `documents_v1`,
 * then atomically move the alias `documents` from one to the other. Readers
 * querying the alias never see a gap and never need redeploying.
 *
 * That makes this list worth reading before anything destructive: a collection
 * that looks unused may be the one an alias points at, and deleting it breaks
 * every workflow querying by the alias rather than the name.
 */
const action: ActionDefinition = {
  key: "alias-list",
  type: "read",
  resource: "collection",
  title: "List aliases",
  description:
    "The names pointing at collections — the mechanism behind zero-downtime re-indexing, and " +
    "the reason a collection that looks unused may not be.",
  params: [],
  output: [
    { key: "aliases", type: "array", label: "Aliases and the collections they point at" },
    { key: "count", type: "number", label: "Aliases defined" },
  ],

  async execute(_input, ctx) {
    const result = await new QdrantClient(ctx).request<{ aliases?: unknown[] }>("/aliases");
    const aliases = result?.aliases ?? [];
    return { aliases, count: aliases.length };
  },
};

export default action;
