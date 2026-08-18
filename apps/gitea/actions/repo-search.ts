import type { ActionDefinition } from "@w6w/types";
import { GiteaClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /repos/search` — verified against Gitea's Swagger document
 * (`repoSearch`).
 *
 * **The one endpoint in this app that does not answer a bare array.** Search
 * wraps its results in `{ok, data}`, so the `data` array is unwrapped here
 * rather than left for every caller to remember. Everything else in Gitea's
 * API returns the array directly, which is exactly why this is easy to trip
 * over.
 */
const action: ActionDefinition = {
  key: "repo-search",
  type: "read",
  resource: "repository",
  title: "Search repositories",
  description: "Find repositories by name, owner or topic.",
  params: [
    { key: "q", label: "Query", type: "string", default: "", hint: "Matches the repository name." },
    {
      key: "owner",
      label: "Owner",
      type: "string",
      default: "",
      hint: "A username or organization to search within.",
    },
    {
      key: "topic",
      label: "Search Topics",
      type: "boolean",
      default: false,
      hint: "Match the query against topics rather than names.",
    },
    {
      key: "private",
      label: "Include Private",
      type: "boolean",
      default: true,
      hint: "Private repositories the token can see.",
    },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    const client = new GiteaClient(ctx);

    ctx.log("info", "searching Gitea repositories", { returnAll, limit });

    // Search is the exception: `{ok, data}` rather than a bare array, so the
    // shared pager does not apply and the pages are walked here.
    const items: unknown[] = [];
    const want = returnAll ? Infinity : limit;
    let page = 1;
    while (items.length < want) {
      // A full page is always requested when walking everything; only the last
      // partial page of a bounded read asks for less.
      const pageLimit = returnAll ? 50 : Math.min(50, Math.max(1, limit - items.length));
      const body = await client.request<{ ok?: boolean; data?: unknown[] }>("/repos/search", {
        query: {
          q: (p.q as string) || undefined,
          owner: (p.owner as string) || undefined,
          topic: p.topic === true ? "true" : undefined,
          private: p.private === false ? "false" : undefined,
          page,
          limit: pageLimit,
        },
      });
      const rows = body?.data ?? [];
      items.push(...rows);
      if (rows.length < pageLimit) break;
      page += 1;
    }
    return returnAll ? items : items.slice(0, limit);
  },
};

export default action;
