import type { ActionDefinition } from "@w6w/types";
import { compact, json, QdrantClient } from "../lib/client.ts";
import { COLLECTION_PARAM } from "../lib/params.ts";

/**
 * `POST /collections/{name}/points/count` — how many points match.
 *
 * ## `exact` is the parameter that decides what the number means
 *
 * With `exact: false` — Qdrant's default — the answer is an **estimate** drawn
 * from the index, fast and approximate. With `exact: true` it is a real count,
 * and on a large collection it is a full scan.
 *
 * A dashboard can live with an estimate. A workflow that branches on "are there
 * any" or reconciles against another system cannot, and the difference is
 * invisible in the response — a number is a number.
 *
 * This action defaults to **exact**, because a workflow asking a count usually
 * wants the count, and the estimate is available by turning it off.
 *
 * The same `filter` as `point-query` applies, which makes this the cheap way to
 * ask "does this tenant have anything" without fetching points.
 */
const action: ActionDefinition = {
  key: "point-count",
  type: "read",
  resource: "point",
  title: "Count points",
  description:
    "How many points match a filter. Qdrant's default is an ESTIMATE from the index — this asks " +
    "for the real count, because a number that might be wrong is hard to spot.",
  params: [
    COLLECTION_PARAM,
    {
      key: "filter",
      label: "Filter",
      type: "json",
      default: "",
      hint: "The cheap way to ask whether a tenant has anything at all.",
    },
    {
      key: "exact",
      label: "Exact",
      type: "boolean",
      default: true,
      hint: "Off gives Qdrant's fast index estimate. On a very large collection the exact count " +
        "is a full scan — but an estimate that quietly disagrees with reality is worse.",
    },
  ],
  output: [
    { key: "count", type: "number", label: "Matching points" },
    { key: "exact", type: "boolean", label: "Whether the number is exact or estimated" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const collection = String(p.collection ?? "").trim();
    if (!collection) throw new Error("`collection` is required");
    const exact = p.exact === undefined ? true : p.exact === true;

    const result = await new QdrantClient(ctx).request<{ count?: number }>(
      `/collections/${encodeURIComponent(collection)}/points/count`,
      { method: "POST", body: compact({ filter: json(p.filter, "filter"), exact }) },
    );

    return { count: Number(result?.count ?? 0), exact };
  },
};

export default action;
