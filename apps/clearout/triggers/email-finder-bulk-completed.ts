import { webhookTrigger } from "../lib/triggers.ts";

/** A bulk email finder list finishes (`email_finder.bulk.completed`). */
const emailFinderBulkCompleted = webhookTrigger({
  key: "email-finder-bulk-completed",
  title: "Bulk Finder Completed",
  description:
    "Fires when a bulk email finder list finishes. The run gets the list id and name (download the results with Bulk Find Download) and the Clearout event envelope.",
  eventType: "email_finder.bulk.completed",
  sample: {
    eventId: "68b18464a73994ef5ae36609",
    eventType: "email_finder.bulk.completed",
    eventMode: "live",
    createdAt: "2026-11-10T10:45:12.310Z",
    status: "success",
    data: { list_id: "68b1821500b0b980de170e2e", list_name: "prospects.csv" },
    payload: {
      event_id: "68b18464a73994ef5ae36609",
      event_type: "email_finder.bulk.completed",
      event_mode: "live",
      event_created_on: "2026-11-10T10:45:12.310Z",
      payload: {
        status: "success",
        data: { list_id: "68b1821500b0b980de170e2e", list_name: "prospects.csv" },
      },
    },
  },
});

export default emailFinderBulkCompleted;
