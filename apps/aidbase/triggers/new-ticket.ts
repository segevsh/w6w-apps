import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import action from "../actions/ticket-list.ts";

/** Keep a small overlap because timestamps are the only ordering guarantee. */
export const OVERLAP_MS = 120_000;
export const clock = { now: (): number => Date.now() };

interface TicketParams {
  ticketFormId: string;
  status?: string;
}

interface TicketState {
  v: 1;
  kind: "ids";
  seeded: true;
  ids: string[];
  cursor: number;
}

const trigger: TriggerDefinition<TicketParams> = {
  key: "new-ticket",
  title: "New Ticket",
  description: "The run gets each ticket created since the last successful check.",
  params: action.params,
  output: [{ key: "id", type: "string", label: "Ticket ID" }],
  sample: { id: "ticket-101" },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const checkedAt = clock.now();
    const prior = state as { cursor?: unknown } | null;
    const cursor = typeof prior?.cursor === "number" ? prior.cursor : checkedAt;
    const createdAfter = new Date(cursor - OVERLAP_MS).toISOString();
    const { events, nextState } = await pollNewItems<unknown>({
      state,
      maxPages: 3,
      maxEvents: 100,
      seenWindow: 400,
      idOf: (item) => String((item as { id?: unknown }).id ?? ""),
      async fetchPage(nextCursor) {
        const result = await action.execute({
          ...params,
          createdAfter,
          limit: 100,
          nextCursor,
        } as never, ctx) as { items?: unknown[]; nextCursor?: unknown };
        return {
          items: result.items ?? [],
          nextPageToken: typeof result.nextCursor === "string" ? result.nextCursor : undefined,
        };
      },
    });
    return { events, nextState: { ...nextState, cursor: checkedAt } as TicketState };
  },
};

export default trigger;
