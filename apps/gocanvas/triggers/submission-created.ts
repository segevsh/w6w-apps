import { webhookTrigger } from "../lib/triggers.ts";

/** A form submission is completed (event type `submission_create`). */
const submissionCreated = webhookTrigger({
  key: "submission-created",
  title: "New Submission",
  description:
    "Fires when a form submission is completed in GoCanvas (event type submission_create), for one form or company-wide. The run gets the event type, the form id and the delivery payload as GoCanvas sent it.",
  eventType: "submission_create",
  sample: {
    eventType: "submission_create",
    formId: "346127",
    payload: {},
  },
});

export default submissionCreated;
