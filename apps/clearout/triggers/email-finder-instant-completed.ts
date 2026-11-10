import { webhookTrigger } from "../lib/triggers.ts";

/** An instant email finder search finishes (`email_finder.instant.completed`). */
const emailFinderInstantCompleted = webhookTrigger({
  key: "email-finder-instant-completed",
  title: "Instant Finder Completed",
  description:
    "Fires when an instant email finder search finishes. The run gets the candidate addresses found and the Clearout event envelope. Clearout may charge for this event.",
  eventType: "email_finder.instant.completed",
  sample: {
    eventId: "69f0621ac1b2d86092997d42",
    eventType: "email_finder.instant.completed",
    eventMode: "live",
    createdAt: "2026-11-10T07:30:34.280Z",
    status: "success",
    data: { emails: [{ email_address: "ada@example.com", role: "no", confidence_score: 95 }] },
    payload: {
      event_id: "69f0621ac1b2d86092997d42",
      event_type: "email_finder.instant.completed",
      event_mode: "live",
      event_created_on: "2026-11-10T07:30:34.280Z",
      payload: {
        status: "success",
        data: { emails: [{ email_address: "ada@example.com", role: "no", confidence_score: 95 }] },
      },
    },
  },
});

export default emailFinderInstantCompleted;
