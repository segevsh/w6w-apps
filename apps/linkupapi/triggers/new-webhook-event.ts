import type { TriggerDefinition } from "@w6w/types";
import webhookEventsList from "../actions/webhook-events-list.ts";

const PAGE = 50;

interface State {
  v: 1;
  seeded: true;
  /** Epoch ms at the first check: nothing stored before it is ever emitted (§9.9). */
  floor: number;
  /** `event_id` of the last event emitted; later checks read after it (§9.8). */
  after?: string;
}

interface StoredEvent {
  event_id?: unknown;
  created_at?: unknown;
}

/**
 * LinkupAPI stores a webhook's events and serves them "oldest first" with a stable
 * `after=<event_id>` cursor and a `since` ISO filter, at no credit cost
 * (https://docs.linkupapi.com/api-reference/v2/webhooks/events.md). The first check records
 * `floor = now` and reads nothing. Later checks read after the last emitted event (or, before
 * any, `since=floor`), emit up to 50 events and move the cursor to the last one, so a backlog
 * longer than a page drains over successive checks without repeats. Events stored before the
 * floor are dropped.
 */
const trigger: TriggerDefinition = {
  key: "new-webhook-event",
  title: "New Webhook Event",
  description:
    "The run gets each event LinkupAPI newly stores for the selected webhook (messages, accepted invitations and the other account events the webhook subscribes to).",
  params: [{
    key: "webhookId",
    label: "Webhook ID",
    type: "string",
    required: true,
    hint: "The id of a webhook created in LinkupAPI. List Webhooks returns it.",
  }],
  output: [
    { key: "event_id", type: "string", label: "Event ID" },
    { key: "event", type: "object", label: "Event payload" },
    { key: "created_at", type: "string", label: "Stored at" },
  ],
  sample: {
    event_id: "sample-event-1",
    event: {
      account_id: "sample-account-id",
      platform: "linkedin",
      event: { type: "message", sender_name: "Avery Example", message_text: "Hello!" },
      timestamp: "2026-11-10T10:31:00Z",
    },
    created_at: "2026-11-10T10:31:00.123Z",
  },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const prior = state as Partial<State> | null;
    if (!prior || prior.v !== 1 || prior.seeded !== true || typeof prior.floor !== "number") {
      const seeded: State = { v: 1, seeded: true, floor: Date.now() };
      return { events: [], nextState: seeded };
    }
    const result = await webhookEventsList.execute({
      webhookId: String((params as { webhookId?: unknown }).webhookId ?? ""),
      ...(prior.after ? { after: prior.after } : { since: new Date(prior.floor).toISOString() }),
      count: PAGE,
    }, ctx) as { data?: { items?: unknown } };
    const items = (Array.isArray(result?.data?.items) ? result.data.items : []) as StoredEvent[];
    const fresh = items.filter((item) => {
      const at = Date.parse(String(item.created_at ?? ""));
      return Number.isNaN(at) || at >= prior.floor!;
    });
    const last = items.length > 0 ? String(items[items.length - 1].event_id ?? "") : "";
    const nextState: State = {
      v: 1,
      seeded: true,
      floor: prior.floor,
      ...(last ? { after: last } : prior.after ? { after: prior.after } : {}),
    };
    return { events: fresh, nextState };
  },
};

export default trigger;
