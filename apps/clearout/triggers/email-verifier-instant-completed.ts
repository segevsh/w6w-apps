import { webhookTrigger } from "../lib/triggers.ts";

/** An instant email verification (Verify Email) finishes (`email_verifier.instant.completed`). */
const emailVerifierInstantCompleted = webhookTrigger({
  key: "email-verifier-instant-completed",
  title: "Instant Verification Completed",
  description:
    "Fires when an instant email verification finishes. The run gets the verification result (status, safe to send, flags) and the Clearout event envelope. Clearout may charge for this event.",
  eventType: "email_verifier.instant.completed",
  sample: {
    eventId: "69f0621ac1b2d86092997d41",
    eventType: "email_verifier.instant.completed",
    eventMode: "live",
    createdAt: "2026-11-10T07:30:34.280Z",
    status: "success",
    data: {
      email_address: "ada@example.com",
      status: "valid",
      safe_to_send: "yes",
      disposable: "no",
      free: "no",
      role: "no",
    },
    payload: {
      event_id: "69f0621ac1b2d86092997d41",
      event_type: "email_verifier.instant.completed",
      event_mode: "live",
      event_created_on: "2026-11-10T07:30:34.280Z",
      payload: {
        status: "success",
        data: {
          email_address: "ada@example.com",
          status: "valid",
          safe_to_send: "yes",
          disposable: "no",
          free: "no",
          role: "no",
        },
      },
    },
  },
});

export default emailVerifierInstantCompleted;
