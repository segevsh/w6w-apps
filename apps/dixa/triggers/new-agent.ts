import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import agentList from "../actions/agent-list.ts";

const MAX_PAGES = 20;

/**
 * Wraps `agent-list` (`GET /v1/agents`) over the organisation's whole agent roster, followed
 * through Dixa's `pageKey` cursor. The roster is the organisation's staff: a small bounded
 * collection (the kit refuses more than 5000 rows, and this trigger stops at 20 pages).
 */
const trigger: TriggerDefinition = {
  key: "new-agent",
  title: "New Agent",
  description: "The run gets each agent or admin newly added to the Dixa organisation.",
  params: [],
  output: [
    { key: "id", type: "string", label: "Agent ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "name", type: "string", label: "Name" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "9e4b2a0c-5f3d-4a8e-b6c1-7d2f0a1b3c4d",
    email: "agent@example.com",
    name: "Alex Agent",
    createdAt: "2026-11-09T10:00:00Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const items: Array<Record<string, unknown>> = [];
    let pageKey: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await (agentList as ActionDefinition).execute({
        pageLimit: 100,
        ...(pageKey ? { pageKey } : {}),
      }, ctx) as { data?: Array<Record<string, unknown>>; nextPageKey?: string };
      items.push(...(result.data ?? []));
      if (!result.nextPageKey) break;
      pageKey = result.nextPageKey;
      if (page === MAX_PAGES - 1) {
        throw new Error("Dixa agent roster exceeds 20 pages; refusing to poll it");
      }
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: items.map((item) => ({ key: String(item.id ?? ""), values: item })),
      emit: { added: true, updated: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
