import { webhookTrigger } from "../lib/triggers.ts";

/** Any Clearout webhook event, optionally narrowed to the event types in the `events` param. */
const anyEvent = webhookTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires for any Clearout webhook event, or only the event types listed in Events (instant and bulk verification, instant and bulk finder, Form Guard email, phone and name validation). The run gets the event type, id, mode, status, data and the full Clearout envelope.",
  anyEvent: true,
  sample: {
    eventId: "69f0621ac1b2d86092997d45",
    eventType: "email_verifier.bulk.completed",
    eventMode: "live",
    createdAt: "2026-11-10T07:30:34.280Z",
    status: "success",
    data: { list_id: "68b1821500b0b980de170e2d", list_name: "contacts.csv" },
    payload: {
      event_id: "69f0621ac1b2d86092997d45",
      event_type: "email_verifier.bulk.completed",
      event_mode: "live",
      event_created_on: "2026-11-10T07:30:34.280Z",
      payload: {
        status: "success",
        data: { list_id: "68b1821500b0b980de170e2d", list_name: "contacts.csv" },
      },
    },
  },
});

export default anyEvent;
