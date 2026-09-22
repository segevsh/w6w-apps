import type { ActionDefinition } from "@w6w/types";
import { compact, HeyReachClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

interface Input {
  search?: string;
  matchingStatus?: string;
  limit?: number;
  offset?: number;
}

/**
 * `POST /api/public/blacklist/GetLeads` — the workspace's blacklisted leads.
 *
 * The blacklist is **workspace-scoped**: the document says an API key only ever
 * sees its own workspace's entries, and every campaign in that workspace
 * excludes them. The list comes back newest first.
 *
 * ## `matchingStatus` is the field worth filtering on
 *
 * A blacklist entry is not always a resolved person. The document enumerates
 * four states, and they mean genuinely different things:
 *
 *  - `Matched` — resolved to a LinkedIn profile, and *that exact person* is
 *    excluded.
 *  - `Matching` — still resolving: a URL waiting on enrichment, or an email
 *    waiting on reverse lookup.
 *  - `NotFound` — the URL or email resolved to nothing, so it excludes nobody.
 *  - `BroadMatch` — a name-only entry, which excludes by exact name comparison.
 *
 * So "is this lead blacklisted" is not answered by paging this list and looking
 * for a name: filter on `matchingStatus` and read `resolutionStage`, which the
 * document describes as the finer-grained diagnostic of the same resolution
 * (`AwaitingReverseLookup`, `ProfileEnrichmentFailed`, `Resolved`, and so on).
 */
const action: ActionDefinition<Input> = {
  key: "blacklist-get-leads",
  type: "search",
  resource: "blacklist",
  title: "Get Blacklisted Leads",
  description:
    "List the blacklisted leads in this workspace, newest first, filtered by search text or " +
    "how the entry resolved (POST /api/public/blacklist/GetLeads).",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Case-insensitive match on name, email, profile URL or LinkedIn member id.",
    },
    {
      key: "matchingStatus",
      label: "Matching status",
      type: "select",
      options: [
        { value: "Matching", label: "Matching — still resolving, excludes nobody yet" },
        { value: "Matched", label: "Matched — resolved to a profile, excludes that person" },
        { value: "NotFound", label: "Not found — resolved to nothing, excludes nobody" },
        { value: "BroadMatch", label: "Broad match — name-only, excludes by exact name" },
      ],
      hint: "Leave empty to return every state.",
    },
    ...paginationParams(10, "Entries per page, 1–100. The API defaults to 10."),
  ],
  output: [
    { key: "totalCount", type: "number", label: "Matching entries" },
    { key: "items", type: "array", label: "Blacklisted leads" },
  ],

  execute(input, ctx) {
    return new HeyReachClient(ctx).request("/blacklist/GetLeads", {
      method: "POST",
      body: compact({
        offset: input.offset,
        limit: input.limit,
        search: input.search,
        matchingStatus: input.matchingStatus,
      }),
    });
  },
};

export default action;
