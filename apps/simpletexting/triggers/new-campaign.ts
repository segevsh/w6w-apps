import type { TriggerDefinition } from "@w6w/types";
import campaignList from "../actions/campaign-list.ts";
import { pollWindow, type Pos } from "../lib/triggers.ts";

interface Campaign {
  campaignId: string;
  started?: string;
  created?: string;
}

/**
 * `GET /api/campaigns?type=ALL&startDateFrom=<iso>` — the endpoint filters by start date
 * (`startDateFrom` / `startDateTo`) and documents no created filter or sort order
 * (https://api-doc.simpletexting.com/, Get all Campaigns, verified 2026-11-10). So the trigger
 * fires when a campaign starts sending: a since-filter window on the start date, resumed by page,
 * floored at the seed. `type=ALL` is sent because the default hides scheduled and recurring ones.
 */
const trigger: TriggerDefinition = {
  key: "new-campaign",
  title: "New Campaign Started",
  description: "The run gets each campaign when it starts sending.",
  params: [
    {
      key: "accountPhone",
      label: "Sent from",
      type: "string",
      placeholder: "8005551234",
      hint: "Only campaigns sent from this account number. Blank means any.",
    },
  ],
  output: [
    { key: "campaignId", type: "string", label: "Campaign ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "state", type: "string", label: "State" },
    { key: "type", type: "string", label: "Type" },
    { key: "accountPhone", type: "string", label: "Sent from" },
    { key: "started", type: "string", label: "Started at" },
  ],
  sample: {
    campaignId: "607f0558a7c898629dd47d7a",
    title: "My first campaign",
    accountPhone: "8005551234",
    state: "COMPLETED",
    type: "IMMEDIATELY",
    created: "2026-11-10T08:00:00.000Z",
    started: "2026-11-10T09:00:00.000Z",
  },
  minIntervalMs: 300_000,
  poll({ state, params }, ctx) {
    const p = (params ?? {}) as { accountPhone?: string };
    return pollWindow<Campaign>({
      state,
      ctx,
      stampOf: (c) => c.started ?? c.created,
      idOf: (c) => String(c.campaignId),
      async read(sinceIso: string, pos: Pos | undefined, c) {
        const page = typeof pos === "number" ? pos : 0;
        const res = await campaignList.execute!(
          {
            page,
            size: 100,
            type: "ALL",
            startDateFrom: sinceIso,
            ...(p.accountPhone ? { accountPhone: p.accountPhone } : {}),
          },
          c,
        ) as { content?: Campaign[]; totalPages?: number };
        return {
          items: res.content ?? [],
          next: page + 1 < (res.totalPages ?? 0) ? page + 1 : undefined,
        };
      },
    });
  },
};

export default trigger;
