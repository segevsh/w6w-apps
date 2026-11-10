import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listCampaigns from "../actions/list-campaigns.ts";

const MAX_PAGES = 50; // 50 pages of 100 = the snapshot kit's 5000-row cap

interface Campaign {
  id: string;
  type?: string;
  attributes?: Record<string, unknown>;
}

/**
 * `GET /campaigns` lists the campaigns the authorized creator owns: a handful, cursor-paged with
 * `page[count]` and `meta.pagination.cursors.next` (https://docs.patreon.com/#pagination, read
 * 2026-11-10), with no creation order to rely on. Every check reads all pages and diffs the ids
 * against the previous check (`pollSnapshot`, added only).
 */
const newCampaign: TriggerDefinition = {
  key: "new-campaign",
  title: "New Campaign",
  description: "The run gets each Patreon campaign newly owned by the connected creator.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "string", label: "Campaign ID" },
    { key: "type", type: "string", label: "Resource type" },
    { key: "attributes", type: "object", label: "Attributes" },
  ],
  sample: {
    id: "123456",
    type: "campaign",
    attributes: { creation_name: "Sample Creator", is_monthly: true },
  },
  async poll({ state }, ctx) {
    const action = listCampaigns as unknown as ActionDefinition;
    const byId = new Map<string, Campaign>();
    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await action.execute({ count: 100, cursor }, ctx) as {
        data?: Campaign[];
        meta?: { pagination?: { cursors?: { next?: string | null } } };
      };
      for (const c of Array.isArray(result?.data) ? result.data : []) {
        if (typeof c?.id !== "string" || c.id === "") {
          throw new Error("Patreon list campaigns returned a campaign without id");
        }
        byId.set(c.id, c);
      }
      const next = result?.meta?.pagination?.cursors?.next;
      if (typeof next !== "string" || next === "") break;
      cursor = next;
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
      emit: { added: true, updated: false },
    });
    return { events: events.map((e) => byId.get(e.key)), nextState };
  },
};

export default newCampaign;
