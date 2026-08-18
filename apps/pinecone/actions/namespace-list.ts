import type { ActionDefinition } from "@w6w/types";
import { PineconeClient } from "../lib/client.ts";
import { INDEX_PARAMS } from "../lib/params.ts";

/**
 * `GET /namespaces` on the index's own host — verified against Pinecone's own
 * `db_data` OpenAPI document (`list_namespaces_operation`).
 *
 * Namespaces are Pinecone's tenancy boundary: records in one are invisible to
 * queries against another, and a query names exactly one. For a
 * multi-customer product that is the whole isolation story — one namespace per
 * customer, and a query that cannot leak across them by construction.
 *
 * Two things worth knowing before designing around them:
 *
 *   - **The default namespace is the empty string**, and it is a real namespace
 *     rather than "all of them". A record written with no namespace is
 *     invisible to a query that names one.
 *   - **The ceiling depends on the plan** — 100 namespaces per index on
 *     Starter, up to 100,000 on Standard and Enterprise. A namespace-per-user
 *     design hits the Starter wall early.
 */
const action: ActionDefinition = {
  key: "namespace-list",
  type: "read",
  resource: "namespace",
  title: "List namespaces",
  description:
    "The namespaces in an index — Pinecone's isolation boundary, one per tenant in most " +
    "designs. The empty-string namespace is the default one.",
  params: [
    ...INDEX_PARAMS,
    {
      key: "prefix",
      label: "Name Prefix",
      type: "string",
      default: "",
      hint: "Lists only namespaces starting with this.",
    },
    {
      key: "returnAll",
      label: "Return All",
      type: "boolean",
      default: false,
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
    { key: "namespaces", type: "array", label: "Namespaces" },
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

    const namespaces: unknown[] = [];
    let token: string | undefined;
    while (namespaces.length < want) {
      const page = await client.request<
        { namespaces?: unknown[]; pagination?: { next?: string } }
      >("/namespaces", {
        host,
        query: {
          prefix: String(p.prefix ?? "") || undefined,
          limit: Math.min(100, want === Infinity ? 100 : want - namespaces.length),
          paginationToken: token,
        },
      });
      const chunk = page?.namespaces ?? [];
      namespaces.push(...chunk);
      token = page?.pagination?.next;
      if (!token || chunk.length === 0) break;
    }

    return {
      namespaces: Number.isFinite(want) ? namespaces.slice(0, want) : namespaces,
      pagination: token ? { next: token } : {},
    };
  },
};

export default action;
