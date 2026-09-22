/**
 * `GET /api/v2/venues` — the business's locations.
 *
 * Venues are what an event's `venue` and a customer's `venue` point at, so this
 * is the list a workflow resolves those ids against. `has_active_sessions`
 * narrows to venues with something scheduled — the shortest route to "which
 * locations are actually in use" — and `status` filters on the venue's own
 * status value, passed through as TeamUp spells it.
 *
 * Both physical sites and online venues are returned here; `venues-get` says
 * which is which.
 */
import type { ActionDefinition } from "@w6w/types";
import { TeamUpClient } from "../lib/client.ts";
import { commonQuery, type ListInput, listParams, paginationQuery } from "../lib/params.ts";
import { pageOutput } from "../lib/outputs.ts";

interface Input extends ListInput {
  status?: string;
  has_active_sessions?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "venues-list",
  type: "search",
  resource: "venue",
  title: "List Venues",
  description:
    "List the business's physical and online locations, optionally only those with sessions " +
    "scheduled (GET /api/v2/venues).",
  params: [
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "The venue's status, as TeamUp spells it.",
    },
    {
      key: "has_active_sessions",
      label: "Has active sessions",
      type: "boolean",
      hint: "Only venues with something scheduled.",
    },
    ...listParams(),
  ],
  output: pageOutput,

  execute(input, ctx) {
    return new TeamUpClient(ctx).request("/venues", {
      query: {
        ...paginationQuery(input),
        status: input.status,
        has_active_sessions: input.has_active_sessions,
        ...commonQuery(input),
      },
      providerId: input.providerId,
    });
  },
};

export default action;
