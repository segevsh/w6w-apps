import type { ActionDefinition } from "@w6w/types";
import { LemlistClient } from "../lib/client.ts";

interface Input {
  campaignId: string;
  state?: string;
  limit?: number;
}

/**
 * `GET /campaigns/{campaignId}/leads/`.
 *
 * The **trailing slash is load-bearing** — lemlist documents this path with one
 * (unlike `/campaigns/{campaignId}`, which has none) and it is the form the
 * OpenAPI document declares.
 *
 * Note this endpoint takes `limit` but **no `offset`** — lemlist's OpenAPI lists
 * only `state` and `limit` for it. So there is no way to page past `limit`
 * (max 500) here; narrow with `state` instead. That absence is why this action
 * does not reuse `PAGE_PARAMS`.
 */
const listCampaignLeads: ActionDefinition<Input> = {
  key: "list-campaign-leads",
  type: "search",
  resource: "lead",
  title: "List Campaign Leads",
  description:
    "List the leads inside one campaign, optionally filtered by state. lemlist offers no offset here — use `state` to narrow.",
  params: [
    {
      key: "campaignId",
      label: "Campaign id",
      type: "string",
      required: true,
      placeholder: "cam_A1B2C3D4E5F6G7H8I9",
    },
    {
      key: "state",
      label: "State",
      type: "string",
      placeholder: "scanned",
      hint:
        "Lead state, e.g. `scanned`, `contacted`, `interested`, `notInterested`. lemlist does " +
        "not publish a closed enum for this filter, so it is a free string.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { min: 1, max: 500, integer: true },
      hint: "Leads to return. lemlist defaults to 100, maximum 500. There is no offset.",
    },
  ],
  output: [{ key: "leads", type: "array", label: "Leads" }],

  execute(input, ctx) {
    return new LemlistClient(ctx).request<unknown[]>(
      `/campaigns/${encodeURIComponent(input.campaignId)}/leads/`,
      { query: { state: input.state, limit: input.limit } },
    );
  },
};

export default listCampaignLeads;
