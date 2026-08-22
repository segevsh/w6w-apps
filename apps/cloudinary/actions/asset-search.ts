import type { ActionDefinition } from "@w6w/types";
import { CloudinaryClient, compact, csv } from "../lib/client.ts";

/**
 * `POST /resources/search` — the Search API.
 *
 * **The path is not the one the documentation gives.** Cloudinary's own Search
 * API page describes the endpoint as `POST /v1_1/{cloud_name}/search`; measured
 * 2026-08-18 that path answers **404** (an HTML page), while
 * `POST /v1_1/{cloud_name}/resources/search` authenticates and routes. This app
 * uses the one that works, and a test pins it.
 *
 * Search is the right tool whenever the question is not "list a folder": it
 * takes a Lucene-like expression over every indexed field — `tags`,
 * `folder`, `format`, `bytes`, `width`, `created_at`, `context.*`,
 * `metadata.*` — with ranges and boolean operators, and it can sort. The
 * `asset-list` action is the cheaper, dumber alternative that only filters by
 * prefix.
 *
 * Two limits worth designing around: the index is **eventually consistent**, so
 * an asset uploaded a moment ago may not appear yet (`asset-get` reads it
 * directly and always will), and search shares the account's hourly API
 * allowance rather than having its own.
 */
const action: ActionDefinition = {
  key: "asset-search",
  type: "search",
  resource: "asset",
  title: "Search assets",
  description:
    "Cloudinary's search expression language over every indexed field — tags, folder, format, " +
    "dimensions, dates, context and structured metadata. The index is eventually consistent.",
  params: [
    {
      key: "expression",
      label: "Expression",
      type: "string",
      required: true,
      default: "",
      placeholder: "resource_type:image AND tags=product AND width>1000",
      hint: "Lucene-like. Fields: tags, folder, format, bytes, width, height, created_at, " +
        "context.*, metadata.*. Ranges work: `created_at>1w`, `bytes:[100 TO 1000]`.",
    },
    {
      key: "sortBy",
      label: "Sort By",
      type: "string",
      default: "",
      placeholder: "created_at:desc",
      hint: "`field:asc` or `field:desc`. Comma-separated for several.",
    },
    {
      key: "withField",
      label: "Include Fields",
      type: "string",
      default: "",
      placeholder: "tags,context",
      hint: "Comma-separated extras the default response omits: `tags`, `context`, " +
        "`metadata`, `image_metadata`.",
    },
    {
      key: "aggregate",
      label: "Aggregate",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated fields to count by — `format`, `resource_type`, `type`. Returns " +
        "counts alongside the results.",
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
      default: 50,
      showIf: { "==": [{ var: "returnAll" }, false] },
      hint: "Cloudinary's maximum per page is 500.",
    },
  ],
  output: [
    { key: "resources", type: "array", label: "Assets" },
    { key: "total_count", type: "number", label: "Total matches" },
    { key: "aggregations", type: "object", label: "Aggregations" },
    { key: "time", type: "number", label: "Search time (ms)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const expression = String(p.expression ?? "").trim();
    if (!expression) throw new Error("`expression` is required");
    const returnAll = p.returnAll === true;
    const want = returnAll ? Infinity : Math.max(1, Number(p.limit ?? 50));

    const client = new CloudinaryClient(ctx);
    const resources: unknown[] = [];
    let cursor: string | undefined;
    let total: number | undefined;
    let aggregations: unknown;

    while (resources.length < want) {
      const page = await client.request<
        {
          resources?: unknown[];
          next_cursor?: string;
          total_count?: number;
          aggregations?: unknown;
        }
      >("/resources/search", {
        method: "POST",
        body: compact({
          expression,
          sort_by: (csv(p.sortBy) ?? []).map((s) => {
            const [field, direction] = s.split(":");
            return { [field]: direction || "desc" };
          }),
          with_field: csv(p.withField),
          aggregate: csv(p.aggregate),
          max_results: Math.min(500, want === Infinity ? 500 : want - resources.length),
          next_cursor: cursor,
        }),
      });
      resources.push(...(page?.resources ?? []));
      total = page?.total_count ?? total;
      aggregations = page?.aggregations ?? aggregations;
      cursor = page?.next_cursor;
      if (!cursor || (page?.resources?.length ?? 0) === 0) break;
    }

    ctx.log("info", "searched Cloudinary", { found: resources.length, total });
    return {
      resources: Number.isFinite(want) ? resources.slice(0, want) : resources,
      total_count: total,
      aggregations,
    };
  },
};

export default action;
