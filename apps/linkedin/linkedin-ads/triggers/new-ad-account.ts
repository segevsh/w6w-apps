import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import action from "../actions/ad-account-list.ts";

/** 50 pages of 100 accounts — the most `pollSnapshot` will hold (5000 rows). */
const MAX_PAGES = 50;

interface Page {
  elements?: Array<{ id?: unknown }>;
  metadata?: { nextPageToken?: string };
}

export default {
  key: "new-ad-account",
  title: "New Ad Account",
  description:
    "The run gets each ad account that becomes accessible to the connection, found by comparing the full `ad-account-list` result with the previous check.",
  output: [
    { key: "id", type: "number", label: "Ad account ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "type", type: "string", label: "Type (BUSINESS or ENTERPRISE)" },
    { key: "currency", type: "string", label: "Currency" },
  ],
  sample: { id: 512345678, name: "Acme Ads", status: "ACTIVE", type: "BUSINESS", currency: "USD" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const rows: Array<{ key: string; values: unknown }> = [];
    let pageToken: string | undefined;
    for (let page = 0;; page++) {
      if (page >= MAX_PAGES) {
        throw new Error(`linkedin-ads new-ad-account: more than ${MAX_PAGES * 100} ad accounts`);
      }
      const result = await (action as ActionDefinition).execute(
        { pageSize: 100, ...(pageToken ? { pageToken } : {}) },
        ctx,
      ) as Page;
      for (const element of result.elements ?? []) {
        rows.push({ key: String(element.id), values: element });
      }
      pageToken = result.metadata?.nextPageToken;
      if (!pageToken) break;
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows,
      emit: { added: true, updated: false },
    });
    return { events: events.map((e) => e.values), nextState };
  },
} satisfies TriggerDefinition;
