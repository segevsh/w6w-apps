import type { ActionDefinition } from "@w6w/types";
import { compact, json, QdrantClient } from "../lib/client.ts";
import { COLLECTION_PARAM } from "../lib/params.ts";

/**
 * `POST /collections/{name}/points/scroll` — walk a collection without
 * searching it.
 *
 * The right call for anything that is not a similarity question: exporting a
 * collection, re-embedding every point after a model change, auditing what a
 * tenant has stored. A query with a limit of ten thousand is a much more
 * expensive way to do the same thing, and Qdrant will do it.
 *
 * ## Here `with_payload` defaults to **true**
 *
 * The opposite of `point-query` in the same API. Worth stating because a
 * developer who learned the default on one endpoint will assume it on the
 * other, in whichever direction burns them.
 *
 * ## The cursor is a point id
 *
 * `next_page_offset` comes back with each page and is passed as `offset` on the
 * next call — a real id, not an opaque token, so a resumable export can store
 * it and mean something by it. `null` is the end.
 */
const action: ActionDefinition = {
  key: "point-scroll",
  type: "read",
  resource: "point",
  title: "Scroll points",
  description:
    "Walk a collection page by page, filtered but not scored — for exports, re-embedding and " +
    "audits. Payloads are on by default here, unlike `point-query`.",
  params: [
    COLLECTION_PARAM,
    {
      key: "filter",
      label: "Filter",
      type: "json",
      default: "",
      hint: "Payload conditions. Scoping an export to one tenant is exactly this.",
    },
    { key: "limit", label: "Page Size", type: "number", default: 100 },
    {
      key: "offset",
      label: "Start From",
      type: "string",
      default: "",
      hint:
        "The `nextOffset` from the previous page — a real point id, so a resumable export can " +
        "store it.",
    },
    { key: "withPayload", label: "Include Payload", type: "boolean", default: true },
    { key: "withVector", label: "Include Vectors", type: "boolean", default: false },
    {
      key: "orderBy",
      label: "Order By",
      type: "json",
      default: "",
      advanced: true,
      hint: 'A payload field, e.g. {"key":"created_at","direction":"desc"}. Requires an index on ' +
        "that field.",
    },
  ],
  output: [
    { key: "points", type: "array", label: "Points in this page" },
    { key: "count", type: "number", label: "Points returned" },
    { key: "nextOffset", type: "string", label: "Pass as Start From; absent at the end" },
    { key: "hasMore", type: "boolean", label: "Whether another page exists" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const collection = String(p.collection ?? "").trim();
    if (!collection) throw new Error("`collection` is required");

    const offset = String(p.offset ?? "").trim();
    const result = await new QdrantClient(ctx).request<{
      points?: unknown[];
      next_page_offset?: string | number | null;
    }>(`/collections/${encodeURIComponent(collection)}/points/scroll`, {
      method: "POST",
      body: compact({
        filter: json(p.filter, "filter"),
        limit: Math.max(1, Number(p.limit ?? 100)),
        offset: offset ? (/^\d+$/.test(offset) ? Number(offset) : offset) : undefined,
        with_payload: p.withPayload === undefined ? true : p.withPayload === true,
        with_vector: p.withVector === true,
        order_by: json(p.orderBy, "orderBy"),
      }),
    });

    const points = result?.points ?? [];
    const next = result?.next_page_offset ?? undefined;
    ctx.log("info", "scrolled Qdrant points", { collection, count: points.length });
    return {
      points,
      count: points.length,
      nextOffset: next === null ? undefined : next,
      hasMore: next !== null && next !== undefined,
    };
  },
};

export default action;
