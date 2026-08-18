import type { ActionDefinition } from "@w6w/types";
import { BlueskyClient, query } from "../lib/client.ts";
import { CURSOR_PARAM, limitParam } from "../lib/params.ts";

/**
 * `app.bsky.actor.searchActors` — find accounts by name or handle.
 *
 * ## Typeahead and search are two endpoints with different behaviour
 *
 * `searchActorsTypeahead` is the fast prefix matcher a search box uses: no
 * paging, few results, tuned for latency. `searchActors` — this one — pages and
 * looks at display names and descriptions too. Using the typeahead for a batch
 * job silently caps the answer.
 *
 * ## Nothing here verifies identity
 *
 * A display name is free text and anybody can set any of it. A handle on a
 * custom domain is the only part with a claim behind it: `@bbc.co.uk` requires
 * control of that DNS name. Matching people by display name is matching on
 * something they chose this morning.
 */
const action: ActionDefinition = {
  key: "profile-search",
  type: "search",
  resource: "profile",
  title: "Search accounts",
  description:
    "Find accounts by handle, display name or description. Only a custom-domain handle carries " +
    "any identity claim — a display name is free text.",
  params: [
    {
      key: "q",
      label: "Query",
      type: "string",
      required: true,
      default: "",
    },
    limitParam(25),
    CURSOR_PARAM,
  ],
  output: [
    { key: "actors", type: "array", label: "Matching accounts" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "cursor", type: "string", label: "Pass back for the next page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const q = String(p.q ?? "").trim();
    if (!q) throw new Error("`q` is required");

    const result = await new BlueskyClient(ctx).call<{ actors?: unknown[]; cursor?: string }>(
      "app.bsky.actor.searchActors",
      {
        query: query({
          q,
          limit: Math.min(100, Math.max(1, Number(p.limit ?? 25))),
          cursor: p.cursor,
        }),
      },
    );

    const actors = result?.actors ?? [];
    return { actors, count: actors.length, cursor: result?.cursor };
  },
};

export default action;
