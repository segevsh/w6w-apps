import type { ActionDefinition } from "@w6w/types";
import { json, TypesenseClient } from "../lib/client.ts";

/**
 * `POST /multi_search` — several searches in one request.
 *
 * ## Why this is not just a convenience
 *
 * Two distinct uses, and both matter more than round-trip savings:
 *
 * - **Federated search.** One query across several collections — products,
 *   articles, people — returning a result set per collection. Doing it as
 *   three requests means three round trips and three chances for one to fail
 *   halfway.
 * - **The same query, different parameters.** Strict and loose, or two
 *   different `query_by` sets, compared side by side. That is how you find out
 *   whether Typesense's widening is changing your answer.
 *
 * ## A failed search inside a successful request
 *
 * Each result carries its own status. `multi_search` answers **200** while an
 * individual search inside it failed — the same shape of trap as the bulk
 * import — so this action reports per-search errors explicitly rather than
 * handing back a `results` array where one entry is an error object.
 *
 * ## Common parameters go in the query string
 *
 * Anything shared — `query_by`, `filter_by` — can be sent once as a query
 * parameter and applies to every search in the body. Per-search values
 * override it.
 */
const action: ActionDefinition = {
  key: "multi-search",
  type: "search",
  resource: "document",
  title: "Run several searches at once",
  description:
    "Federated search across collections, or the same query with different parameters compared " +
    "side by side. Note multi_search answers 200 while an individual search inside it FAILED, so " +
    "this reports per-search errors rather than burying them in the results array.",
  params: [
    {
      key: "searches",
      label: "Searches",
      type: "json",
      required: true,
      default: "",
      placeholder:
        '[{"collection":"products","q":"boots","query_by":"name"},{"collection":"articles","q":"boots","query_by":"title"}]',
      hint: "An array of search objects, each with at least `collection`, `q` and `query_by`.",
    },
    {
      key: "commonQueryBy",
      label: "Shared query_by",
      type: "string",
      default: "",
      hint: "Applied to every search that does not set its own.",
    },
    {
      key: "commonFilterBy",
      label: "Shared filter_by",
      type: "string",
      default: "",
    },
  ],
  output: [
    { key: "results", type: "array", label: "One result per search, in order" },
    { key: "count", type: "number", label: "How many searches ran" },
    { key: "totalFound", type: "number", label: "Hits across all of them" },
    { key: "foundPerSearch", type: "array", label: "How many each search found" },
    { key: "errors", type: "array", label: "Searches that failed inside a 200 response" },
    { key: "allSucceeded", type: "boolean", label: "False if any single search failed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const searches = json(p.searches, "searches");
    if (!Array.isArray(searches) || !searches.length) {
      throw new Error("`searches` must be a non-empty array of search objects");
    }

    const missing = searches
      .map((search, index) => ({ search: search as Record<string, unknown>, index }))
      .filter(({ search }) => !search?.collection || !search?.q);
    if (missing.length) {
      throw new Error(
        `every search needs a \`collection\` and a \`q\` — these do not: ${
          missing.map(({ index }) => index).join(", ")
        }. Use \`q: "*"\` to match everything`,
      );
    }

    const result = await new TypesenseClient(ctx).request<{
      results?: Array<{
        found?: number;
        hits?: unknown[];
        code?: number;
        error?: string;
        request_params?: { collection_name?: string };
      }>;
    }>("/multi_search", {
      method: "POST",
      query: {
        query_by: String(p.commonQueryBy ?? "").trim() || undefined,
        filter_by: String(p.commonFilterBy ?? "").trim() || undefined,
      },
      body: { searches },
    });

    const results = result?.results ?? [];
    // A 200 can carry a failed search, and burying it is how it gets missed.
    const errors = results
      .map((entry, index) => ({ index, entry }))
      .filter(({ entry }) => entry?.error || (entry?.code && entry.code >= 400))
      .map(({ index, entry }) => ({
        index,
        collection: entry?.request_params?.collection_name,
        code: entry?.code,
        error: entry?.error,
      }));

    if (errors.length) {
      ctx.log(
        "warn",
        "one or more searches failed inside a 200 response — multi_search reports each result " +
          "separately, so the request succeeding says nothing about the searches",
        { failed: errors.length, of: results.length },
      );
    }

    return {
      results,
      count: results.length,
      totalFound: results.reduce((sum, entry) => sum + Number(entry?.found ?? 0), 0),
      foundPerSearch: results.map((entry) => entry?.found ?? null),
      errors,
      allSucceeded: errors.length === 0,
    };
  },
};

export default action;
