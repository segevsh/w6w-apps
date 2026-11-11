import { anyEventTrigger } from "../lib/triggers.ts";

/** Any HighLevel webhook event, optionally narrowed to a list of event names. */
const anyEvent = anyEventTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires for any HighLevel webhook event delivered to its URL (contacts, opportunities, appointments, messages, tasks, notes, invoices, products, users, locations and the rest of the event catalog), or only the event names listed in Events. The run gets the event type, the location id, the record, contact and conversation ids where the event has them, and the full payload.",
  sample: {
    type: "TaskCreate",
    locationId: "sample-location-id",
    id: "sample-task-id",
    contactId: "sample-contact-id",
    conversationId: null,
    data: {
      type: "TaskCreate",
      locationId: "sample-location-id",
      id: "sample-task-id",
      contactId: "sample-contact-id",
      title: "Call back",
      completed: false,
    },
  },
});

export default anyEvent;
