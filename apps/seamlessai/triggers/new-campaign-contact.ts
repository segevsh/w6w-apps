import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import { allCampaignContacts } from "../lib/feeds.ts";

/**
 * `GET /campaigns/{id}/contacts` has no sort order and no enrollment date
 * (https://docs.seamless.ai/api-reference/v2/campaigns/list-campaign-contacts), so each check
 * reads the campaign's enrolled contacts (50 per page, at most 20 pages) and diffs the contact ids
 * (`pollSnapshot`, added only). A campaign past 1000 contacts fails loudly instead of truncating.
 */
const trigger: TriggerDefinition = {
  key: "new-campaign-contact",
  title: "New Campaign Contact",
  description: "The run gets each contact added to the chosen campaign since the last check.",
  minIntervalMs: 300_000,
  params: [
    {
      key: "campaignId",
      label: "Campaign ID",
      type: "string",
      required: true,
      hint: "Campaign ID from the New Campaign trigger or List Campaigns.",
    },
  ],
  output: [
    { key: "contactId", type: "string", label: "Contact ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "company", type: "string", label: "Company" },
  ],
  sample: { contactId: "48213377", firstName: "Dana", lastName: "Reyes", company: "Acme" },
  async poll({ params, state }, ctx) {
    const data = await allCampaignContacts(
      ctx,
      (params as { campaignId?: unknown }).campaignId,
    ) as Array<{ contactId: string | number }>;
    const { events, nextState } = await pollSnapshot({
      state,
      rows: data.map((r) => ({ key: String(r.contactId), values: r })),
      emit: { added: true, updated: false },
    });
    return { events: events.map((e) => e.values), nextState };
  },
};

export default trigger;
