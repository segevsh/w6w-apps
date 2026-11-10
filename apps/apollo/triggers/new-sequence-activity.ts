import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import sequenceActivityList from "../actions/sequence-activity-list.ts";

const action = sequenceActivityList as unknown as ActionDefinition;

/**
 * `POST /emailer_campaigns/activity_feed` returns one contact's sequence events "ordered
 * newest-first", at most 50 per call, 0 credits
 * (https://docs.apollo.io/reference/get-contact-sequence-activity, 2026-11-10). An event has no id of
 * its own, so the id is the sequence, event type, time and message it names.
 */
const trigger = pollFromListAction({
  key: "new-sequence-activity",
  title: "New Contact Sequence Activity",
  description:
    "The run gets each new sequence event (enrolled, paused, replied, completed, ...) of the chosen contact.",
  action,
  params: [
    { key: "contact_id", label: "Contact", type: "string", required: true },
    {
      key: "sequence_id",
      label: "Sequence",
      type: "string",
      hint: "Limit to events from one sequence. Leave empty for events across all sequences.",
    },
  ],
  input: (params) => {
    const p = params as { contact_id?: string; sequence_id?: string };
    return {
      contact_id: p.contact_id,
      ...(p.sequence_id ? { sequence_id: p.sequence_id } : {}),
      per_page: 50,
    };
  },
  items: (result) => (result as { events?: unknown[] }).events ?? [],
  idOf: (item) => {
    const e = item as {
      sequence_id?: unknown;
      type?: unknown;
      occurred_at?: unknown;
      emailer_message_id?: unknown;
    };
    return [e.sequence_id, e.type, e.occurred_at, e.emailer_message_id].map((v) => String(v ?? ""))
      .join(":");
  },
  output: [
    { key: "type", type: "string", label: "Event type" },
    { key: "occurred_at", type: "string", label: "Occurred at" },
    { key: "sequence_id", type: "string", label: "Sequence ID" },
    { key: "sequence_name", type: "string", label: "Sequence name" },
    { key: "emailer_message_id", type: "string", label: "Message ID" },
  ],
  sample: {
    type: "replied",
    occurred_at: "2026-07-26T10:26:55Z",
    sequence_id: "66e9e215ece19801b219997f",
    sequence_name: "Q2 Outreach",
    emailer_message_id: "66e8cc45028aed019c25d724",
  },
});

export default trigger;
