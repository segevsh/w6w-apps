import { sinceTrigger, toMs } from "../lib/since.ts";
import eventList from "../actions/event-list.ts";

interface OrgEvent {
  id?: string;
  date?: string;
}

/**
 * Order-independent: each check lists the events since the previous check (the `start` filter of
 * the event-list action, minus a two-minute overlap), follows the continuation token, and
 * de-duplicates on the event id, so it does not depend on the order Bitwarden returns events in.
 */
export default sinceTrigger<OrgEvent>({
  key: "new-event",
  title: "New Event",
  description: "The run gets each newly recorded organization audit event.",
  async fetchPage(sinceMs, _page, ctx, _params, token) {
    const res = await eventList.execute({
      start: new Date(sinceMs).toISOString(),
      continuationToken: token,
      maxPages: 1,
    }, ctx) as { events?: OrgEvent[]; continuationToken?: string };
    return {
      items: res.events ?? [],
      more: typeof res.continuationToken === "string" && res.continuationToken !== "",
      next: res.continuationToken,
    };
  },
  pageSize: 50,
  idOf: (e) => String(e.id),
  tsOf: (e) => toMs(e.date),
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "type", type: "number", label: "Event type code" },
    { key: "date", type: "string", label: "Event time" },
    { key: "memberId", type: "string", label: "Member ID" },
  ],
  sample: {
    id: "9a327ab7-5be3-4f8a-a0df-b0a300a5f92a",
    type: 1000,
    date: "2026-11-09T09:00:00Z",
    memberId: "0d2a9a2d-3b1c-4f0a-9d5e-7e2d0a3c5b11",
  },
});
