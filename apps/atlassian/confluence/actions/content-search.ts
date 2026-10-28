import type { ActionDefinition } from "@w6w/types";
import { ConfluenceClient } from "../lib/client.ts";

/**
 * `GET /wiki/rest/api/search` — **the one v1 endpoint in this app**, and the
 * reason is that v2 has no replacement for it.
 *
 * Confluence's REST API v2 publishes 151 paths and not one of them is a search:
 * CQL (Confluence Query Language) lives only on v1, and without it there is no
 * way to answer "find pages mentioning X, modified since Y" — the single most
 * useful thing a workflow does with a wiki. So this action calls v1
 * deliberately rather than dropping search, and says so here instead of hiding
 * it. `user-current` is the only other v1 call, for the same reason.
 *
 * v1 pagination is `start`/`limit` offsets, not v2's cursor, so this does not
 * use the shared pager.
 */
const action: ActionDefinition = {
  key: "content-search",
  type: "search",
  resource: "content",
  title: "Search content (CQL)",
  description: "Search pages, blog posts and attachments with a CQL query.",
  params: [
    {
      key: "cql",
      label: "CQL Query",
      type: "string",
      required: true,
      default: "",
      placeholder: 'type = page AND space = "ENG" AND text ~ "onboarding"',
      hint: "Confluence Query Language. See Atlassian's Advanced Searching docs.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 25,
      hint: "Results per page. Confluence caps this well below its list endpoints.",
    },
    { key: "start", label: "Start", type: "number", default: 0, hint: "Offset for paging." },
    {
      key: "excerpt",
      label: "Excerpt",
      type: "select",
      default: "",
      options: [
        { value: "indexed", label: "Indexed text" },
        { value: "highlight", label: "Highlighted match" },
        { value: "none", label: "None" },
      ],
    },
    {
      key: "includeArchivedSpaces",
      label: "Include Archived Spaces",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "results", type: "array", label: "Results" },
    { key: "start", type: "number", label: "Start offset" },
    { key: "limit", type: "number", label: "Page size" },
    { key: "size", type: "number", label: "Results on this page" },
    { key: "totalSize", type: "number", label: "Total matches" },
    { key: "cqlQuery", type: "string", label: "Query as parsed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const cql = String(p.cql ?? "").trim();
    if (!cql) throw new Error("`cql` is required");

    const client = new ConfluenceClient(ctx);
    ctx.log("info", "searching Confluence", { cql });

    return await client.requestV1("/search", {
      query: {
        cql,
        limit: typeof p.limit === "number" ? p.limit : 25,
        start: typeof p.start === "number" ? p.start : undefined,
        excerpt: (p.excerpt as string) || undefined,
        includeArchivedSpaces: p.includeArchivedSpaces === true ? "true" : undefined,
      },
    });
  },
};

export default action;
