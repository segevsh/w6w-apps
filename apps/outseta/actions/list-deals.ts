import type { ActionDefinition } from "@w6w/types";
import {
  OutsetaClient,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  q?: string;
  ownerUid?: string;
}

/** `GET /api/v1/crm/deals` — List CRM deals, optionally by owner or a name/stage/account search. */
const listDeals: ActionDefinition<Input> = {
  key: "list-deals",
  type: "search",
  resource: "deal",
  title: "List Deals",
  description: "List CRM deals, optionally by owner or a name/stage/account search.",
  params: [
    ...PAGE_PARAMS,
    {
      key: "q",
      label: "Search",
      type: "string",
      hint: "Matches deal name, pipeline stage name or account name.",
    },
    {
      key: "ownerUid",
      label: "Owner Uid",
      type: "string",
      hint: "A person Uid, `-1` for unassigned deals, `-2` for all assigned deals.",
    },
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(`/crm/deals`, {
      method: "GET",
      query: { ...pageQuery(input), q: input.q, ownerUid: input.ownerUid },
    });
  },
};

export default listDeals;
