import type { TriggerDefinition } from "@w6w/types";
import eventAttendeeList from "../actions/event-attendee-list.ts";
import { newRecords, readAllPages } from "../lib/triggers.ts";

/**
 * One event's RSVP list is bounded by the event's capacity; GET /event_attendees takes only
 * `event_id` / paging (no sort or since filter), so every check reads all pages through
 * `event-attendee-list` and diffs the ids (`pollSnapshot`, added only).
 * https://api-headless.circle.so/api/admin/v2/swagger.yaml (2026-11-10)
 */
const trigger: TriggerDefinition = {
  key: "new-event-attendee",
  title: "New Event RSVP",
  description: "The run gets each new RSVP on the chosen Circle event.",
  params: [
    {
      key: "eventId",
      label: "Event ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
  ],
  output: [
    { key: "id", type: "number", label: "Attendee ID" },
    { key: "event_id", type: "number", label: "Event ID" },
    { key: "member_name", type: "string", label: "Member name" },
    { key: "member_email", type: "string", label: "Member email" },
    { key: "rsvp_status", type: "string", label: "RSVP status" },
    { key: "rsvp_date", type: "string", label: "RSVP date" },
  ],
  sample: {
    id: 2,
    event_id: 2,
    member_name: "Sample Member",
    member_email: "member@example.com",
    rsvp_status: "yes",
    rsvp_date: "2026-11-09T10:51:43.834Z",
  },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const eventId = Number((params as { eventId?: unknown }).eventId);
    if (!Number.isInteger(eventId)) throw new Error("eventId must be an integer");
    return newRecords({ state, items: await readAllPages(eventAttendeeList, { eventId }, ctx) });
  },
};

export default trigger;
