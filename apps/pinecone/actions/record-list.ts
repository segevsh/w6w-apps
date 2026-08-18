import type { ActionDefinition } from "@w6w/types";
import { PineconeClient } from "../lib/client.ts";
import { INDEX_PARAMS, NAMESPACE_PARAM } from "../lib/params.ts";

/**
 * `GET /vectors/list` on the index's own host — verified against Pinecone's own
 * `db_data` OpenAPI document (`list_vectors`).
 *
 * **Ids only, and only by prefix.** This is not a scan of the index: it lists
 * record *ids* in one namespace, optionally filtered by an id prefix, and
 * returns no values and no metadata. Pair it with `record-fetch` when the
 * contents are wanted.
 *
 * That makes the id scheme a design decision rather than a detail. Pinecone's
 * own guidance is to prefix ids by their parent document — `doc123#chunk1`,
 * `doc123#chunk2` — precisely so this call can enumerate one document's chunks
 * and `record-delete` can remove them together. An index built with opaque
 * UUIDs cannot do either.
 *
 * Paging is by `paginationToken`, which this follows until the requested number
 * of ids is reached.
 */
const action: ActionDefinition = {
  key: "record-list",
  type: "read",
  resource: "record",
  title: "List record IDs",
  description:
    "Enumerate record ids in a namespace, optionally by prefix — the reason to prefix ids by " +
    "their parent document. Returns ids only, not values or metadata.",
  params: [
    ...INDEX_PARAMS,
    NAMESPACE_PARAM,
    {
      key: "prefix",
      label: "ID Prefix",
      type: "string",
      default: "",
      placeholder: "doc123#",
      hint: "Lists only ids starting with this. With `doc123#chunk1`-style ids, it enumerates " +
        "one document's chunks.",
    },
    {
      key: "returnAll",
      label: "Return All",
      type: "boolean",
      default: false,
      hint: "Page through every id under the prefix.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      showIf: { "==": [{ var: "returnAll" }, false] },
    },
  ],
  output: [
    { key: "vectors", type: "array", label: "Record ids" },
    { key: "namespace", type: "string", label: "Namespace" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const want = returnAll ? Infinity : Math.max(1, Number(p.limit ?? 100));
    const client = new PineconeClient(ctx);
    const host = await client.hostFor(
      String(p.indexName ?? ""),
      p.indexHost as string | undefined,
    );
    const namespace = String(p.namespace ?? "");
    const prefix = String(p.prefix ?? "");

    const ids: unknown[] = [];
    let token: string | undefined;
    while (ids.length < want) {
      const page = await client.request<
        { vectors?: unknown[]; pagination?: { next?: string }; namespace?: string }
      >("/vectors/list", {
        host,
        query: {
          namespace,
          prefix: prefix || undefined,
          limit: Math.min(100, want === Infinity ? 100 : want - ids.length),
          paginationToken: token,
        },
      });
      const chunk = page?.vectors ?? [];
      ids.push(...chunk);
      token = page?.pagination?.next;
      if (!token || chunk.length === 0) break;
    }

    return {
      vectors: Number.isFinite(want) ? ids.slice(0, want) : ids,
      namespace,
      pagination: token ? { next: token } : {},
    };
  },
};

export default action;
