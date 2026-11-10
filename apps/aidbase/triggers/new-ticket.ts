import type { TriggerDefinition } from "@w6w/types";
import { pollWindow, toMs } from "../lib/window.ts";
import action from "../actions/ticket-list.ts";

/** Keep a small overlap because timestamps are the only ordering guarantee. */
export const OVERLAP_MS = 120_000;
/** Pages read per check; a longer window is resumed on the next check (brief 9.8). */
export const MAX_PAGES = 10;
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
    const result = await pollWindow<unknown, string>({
      state,
      now: clock.now(),
      overlapMs: OVERLAP_MS,
      maxPages: MAX_PAGES,
      pageSize: 100,
      seenWindow: 400,
      idOf: (item) => String((item as { id?: unknown }).id ?? ""),
      tsOf: (item) => {
        const t = item as Record<string, unknown>;
        return toMs(t.created_at ?? t.createdAt);
      },
      async load(since, nextCursor) {
        const res = await action.execute({
          ...params,
          createdAfter: new Date(since).toISOString(),
          limit: 100,
          nextCursor,
        } as never, ctx) as { items?: unknown[]; nextCursor?: unknown };
        return {
          items: res.items ?? [],
          next: typeof res.nextCursor === "string" && res.nextCursor !== ""
            ? res.nextCursor
            : undefined,
        };
      },
    });
    return { events: result.events, nextState: result.nextState as unknown as TicketState };
  },
};

export default trigger;
