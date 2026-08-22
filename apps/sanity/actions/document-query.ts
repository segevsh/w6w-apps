import type { ActionDefinition } from "@w6w/types";
import { json, SanityClient } from "../lib/client.ts";
import { DATASET_PARAM } from "../lib/params.ts";

/**
 * `GET /data/query/{dataset}` — run a GROQ query.
 *
 * The main way anything is read out of Sanity, and the one place a workflow
 * meets **GROQ**: a query language that filters, projects and joins in one
 * expression. `*[_type == "article" && published == true]{title, "author":
 * author->name}[0...10]` is a filter, a projection, a dereference and a slice.
 *
 * ## Parameters, not string concatenation
 *
 * Values go in as `$`-prefixed parameters, sent as `$name=<json>` query
 * arguments, and this action takes them as an object. Interpolating a value
 * into the query text instead is how a stray quote turns into a syntax error —
 * and how untrusted input becomes a query nobody intended.
 *
 * ## Drafts are separate documents
 *
 * A draft is stored as its own document with a `drafts.` prefix on the id, so a
 * plain `*[_type == "article"]` returns **both** the published article and its
 * draft, as two results with nearly identical content. The Published Only
 * switch adds the filter that excludes them, which is what most workflows
 * actually want and almost nobody remembers to write.
 */
const action: ActionDefinition = {
  key: "document-query",
  type: "search",
  resource: "document",
  title: "Query documents (GROQ)",
  description:
    "Run a GROQ query. Remember that drafts are separate documents with a `drafts.` id prefix, " +
    "so an unfiltered query returns each edited document twice.",
  params: [
    {
      key: "query",
      label: "GROQ Query",
      type: "text",
      required: true,
      default: "",
      placeholder: '*[_type == "article"]{_id, title, "author": author->name}[0...10]',
      hint: "Filters, projections, dereferences (`->`) and slices in one expression.",
    },
    {
      key: "params",
      label: "Parameters",
      type: "json",
      default: "",
      hint: 'Object of `$`-parameters, e.g. `{"type":"article"}` for `*[_type == $type]`. Use ' +
        "these rather than building the query string — a stray quote in an interpolated value " +
        "breaks the query, or changes it.",
    },
    {
      key: "publishedOnly",
      label: "Published Only",
      type: "boolean",
      default: true,
      hint: "Adds `!(_id in path('drafts.**'))` to your filter. Off, every edited document comes " +
        "back twice — once published, once as its draft.",
    },
    DATASET_PARAM,
  ],
  output: [
    { key: "result", type: "array", label: "Result" },
    { key: "ms", type: "number", label: "Query time (ms)" },
    { key: "query", type: "string", label: "Query as sent" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    let query = String(p.query ?? "").trim();
    if (!query) throw new Error("`query` is required");

    if (p.publishedOnly !== false) {
      // Wrap rather than splice: `*[filter]` becomes
      // `*[filter && !(_id in path("drafts.**"))]` only when we can see the
      // filter's brackets, and otherwise the guard is appended as its own step.
      const match = query.match(/^\*\s*\[([\s\S]*?)\]([\s\S]*)$/);
      query = match
        ? `*[${match[1]} && !(_id in path("drafts.**"))]${match[2]}`
        : `${query}[!(_id in path("drafts.**"))]`;
    }

    const client = new SanityClient(ctx);
    const dataset = client.datasetFor(p.dataset);
    const params = json(p.params, "params");
    const query_: Record<string, string> = { query };
    if (params && typeof params === "object") {
      for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
        // Sanity takes parameters as `$name=<json>` query arguments.
        query_[`$${k}`] = JSON.stringify(v);
      }
    }

    ctx.log("info", "querying Sanity", { dataset, cdn: client.useCdn });
    const body = await client.request<{ result?: unknown; ms?: number }>(
      `/data/query/${encodeURIComponent(dataset)}`,
      { query: query_ },
    );
    return { result: body?.result, ms: body?.ms, query };
  },
};

export default action;
