import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listCampaigns from "../actions/list-campaigns.ts";

const MAX_PAGES = 40;

/**
 * `GET /api/campaigns` takes `filter[status]` (sent, draft, ready; the vendor default is ready),
 * `limit` (default 25) and `page`, with no sort order and no since filter
 * (https://developers.mailerlite.com/docs/campaigns.html, verified 2026-11-10). Every check reads
 * the chosen status through `list-campaigns` (25 a page, following `meta.last_page`, at most 1000
 * campaigns) and diffs the ids; the first check only records them. Sent campaigns are also
 * delivered the moment they go out by the Campaign Sent webhook trigger.
 */
const trigger: TriggerDefinition<{ status?: "sent" | "draft" | "ready" }> = {
  key: "new-campaign",
  title: "New Campaign",
  description:
    "The run gets each campaign newly created in the MailerLite account with the chosen status (draft by default).",
  params: [{
    key: "status",
    label: "Status",
    type: "select",
    default: "draft",
    hint:
      "Which campaigns to watch. A campaign that moves between statuses shows up when it enters the chosen one.",
    options: [
      { value: "draft", label: "Draft" },
      { value: "ready", label: "Ready" },
      { value: "sent", label: "Sent" },
    ],
  }],
  output: [
    { key: "id", type: "string", label: "Campaign ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "1",
    name: "dummy campaign",
    type: "regular",
    status: "draft",
    created_at: "2026-11-10 09:00:00",
  },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const status = params?.status ?? "draft";
    const campaigns: Array<{ id?: unknown }> = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const out = await listCampaigns.execute({ status, limit: 25, page }, ctx) as {
        data?: Array<{ id?: unknown }>;
        meta?: { last_page?: number };
      };
      campaigns.push(...(Array.isArray(out?.data) ? out.data : []));
      if (Number(out?.meta?.last_page ?? 1) <= page) break;
      if (page === MAX_PAGES) {
        throw new Error(
          "MailerLite account has more than 1000 campaigns with this status; refusing to snapshot it",
        );
      }
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: campaigns.map((campaign) => ({ key: String(campaign.id ?? ""), values: campaign })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
