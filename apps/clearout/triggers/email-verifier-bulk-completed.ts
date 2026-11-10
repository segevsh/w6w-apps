import { webhookTrigger } from "../lib/triggers.ts";

/** A bulk email verification list finishes (`email_verifier.bulk.completed`). */
const emailVerifierBulkCompleted = webhookTrigger({
  key: "email-verifier-bulk-completed",
  title: "Bulk Verification Completed",
  description:
    "Fires when a bulk email verification list finishes. The run gets the list id and name (download the results with Bulk Verify Download) and the Clearout event envelope.",
  eventType: "email_verifier.bulk.completed",
  sample: {
    eventId: "68b18464a73994ef5ae36608",
    eventType: "email_verifier.bulk.completed",
    eventMode: "live",
    createdAt: "2026-11-10T10:43:48.077Z",
    status: "success",
    data: { list_id: "68b1821500b0b980de170e2d", list_name: "contacts.csv" },
    payload: {
      event_id: "68b18464a73994ef5ae36608",
      event_type: "email_verifier.bulk.completed",
      event_mode: "live",
      event_created_on: "2026-11-10T10:43:48.077Z",
      payload: {
        status: "success",
        data: { list_id: "68b1821500b0b980de170e2d", list_name: "contacts.csv" },
      },
    },
  },
});

export default emailVerifierBulkCompleted;
