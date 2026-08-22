import type { ActionDefinition } from "@w6w/types";
import { compact, json, QdrantClient } from "../lib/client.ts";
import { COLLECTION_PARAM } from "../lib/params.ts";

/**
 * `POST /collections/{name}/points/query` — find the nearest vectors.
 *
 * ## This one endpoint replaced four
 *
 * Qdrant used to have `points/search`, `points/recommend` and
 * `points/discover`. The current API has **only** `query`, which in the spec's
 * own words *"covers all capabilities of search, recommend, discover, filters.
 * But also enables hybrid and multi-stage queries."* Most examples on the
 * internet still call `points/search`, which is not in the current spec at all.
 *
 * ## `with_payload` defaults to false, and that is the trap
 *
 * A query with Qdrant's defaults returns **ids and scores and nothing else** —
 * no payload, no vectors. A workflow that searches and then reads a field off
 * a result gets `undefined`, and the search looked like it worked.
 *
 * That default is a deliberate optimisation for a service that only needs ids.
 * It is the wrong default for a workflow, so this action turns payloads **on**
 * and says so.
 *
 * ## The filter is where the real work happens
 *
 * Vector similarity alone is rarely the whole question. `filter` restricts by
 * payload before scoring — `must`, `should`, `must_not` over field conditions —
 * which is how "similar documents **belonging to this tenant**" is expressed.
 * Getting that wrong is not a performance problem, it is a data-leak one, so
 * the filter is a first-class parameter rather than an advanced footnote.
 *
 * ## `score_threshold` is scale-dependent
 *
 * Its meaning follows the collection's distance metric: for Cosine, higher is
 * closer; for Euclid, **lower** is closer. A threshold copied between
 * collections with different metrics silently filters the wrong end.
 */
const action: ActionDefinition = {
  key: "point-query",
  type: "search",
  resource: "point",
  title: "Query points",
  description:
    "Find the nearest vectors, optionally filtered by payload. Qdrant returns ids and scores " +
    "ONLY by default — this asks for payloads, because a workflow needs the data.",
  params: [
    COLLECTION_PARAM,
    {
      key: "vector",
      label: "Query Vector",
      type: "json",
      default: "",
      hint: "An array of numbers, or a point id to find neighbours of that point. Omit both and " +
        "Qdrant returns points ordered by id, which is a scroll rather than a search.",
    },
    {
      key: "filter",
      label: "Filter",
      type: "json",
      default: "",
      hint: "Payload conditions applied BEFORE scoring, e.g. " +
        '{"must":[{"key":"tenant","match":{"value":"acme"}}]}. This is how you scope a search to ' +
        "one tenant, and getting it wrong is a data-leak rather than a performance problem.",
    },
    { key: "limit", label: "Limit", type: "number", default: 10 },
    { key: "offset", label: "Offset", type: "number", default: 0, advanced: true },
    {
      key: "withPayload",
      label: "Include Payload",
      type: "boolean",
      default: true,
      hint: "Qdrant defaults this to FALSE and returns ids and scores alone. On here, because a " +
        "workflow that searches then reads a field would otherwise get undefined.",
    },
    {
      key: "withVector",
      label: "Include Vectors",
      type: "boolean",
      default: false,
      hint: "Off — a vector is hundreds of floats per point and is rarely what the next step " +
        "wants.",
    },
    {
      key: "scoreThreshold",
      label: "Score Threshold",
      type: "number",
      default: 0,
      hint: "Scale depends on the collection's metric: for Cosine higher is closer, for Euclid " +
        "LOWER is. A threshold copied between collections filters the wrong end.",
    },
    {
      key: "using",
      label: "Vector Name",
      type: "string",
      default: "",
      advanced: true,
      hint: "For a collection with named vectors. Omitted, the default vector is used.",
    },
    {
      key: "prefetch",
      label: "Prefetch",
      type: "json",
      default: "",
      advanced: true,
      hint: "Sub-queries run first, whose results this query re-ranks — how hybrid dense-plus-" +
        "sparse search is expressed.",
    },
  ],
  output: [
    { key: "points", type: "array", label: "Matches, nearest first, with their payloads" },
    { key: "count", type: "number", label: "Matches returned" },
    { key: "topScore", type: "number", label: "The best score, for a relevance gate" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const collection = String(p.collection ?? "").trim();
    if (!collection) throw new Error("`collection` is required");

    const threshold = Number(p.scoreThreshold ?? 0);
    const body = compact({
      query: json(p.vector, "vector"),
      filter: json(p.filter, "filter"),
      prefetch: json(p.prefetch, "prefetch"),
      using: p.using,
      limit: Math.max(1, Number(p.limit ?? 10)),
      offset: Number(p.offset ?? 0) || undefined,
      score_threshold: Number.isFinite(threshold) && threshold !== 0 ? threshold : undefined,
      // Qdrant's defaults are false; a workflow needs the data.
      with_payload: p.withPayload === undefined ? true : p.withPayload === true,
      with_vector: p.withVector === true,
    });

    const result = await new QdrantClient(ctx).request<{ points?: Array<{ score?: number }> }>(
      `/collections/${encodeURIComponent(collection)}/points/query`,
      { method: "POST", body },
    );

    const points = result?.points ?? [];
    // A count and the best score — never the payloads, which are the data.
    ctx.log("info", "queried Qdrant", { collection, count: points.length });
    return { points, count: points.length, topScore: points[0]?.score };
  },
};

export default action;
