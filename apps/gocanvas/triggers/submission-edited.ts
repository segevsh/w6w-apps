import { webhookTrigger } from "../lib/triggers.ts";

/** A completed submission is edited (event type `submission_edit`). */
const submissionEdited = webhookTrigger({
  key: "submission-edited",
  title: "Submission Edited",
  description:
    "Fires when a completed form submission is edited in GoCanvas (event type submission_edit), for one form or company-wide. The run gets the event type, the form id and the delivery payload as GoCanvas sent it.",
  eventType: "submission_edit",
  sample: {
    eventType: "submission_edit",
    formId: "346127",
    payload: {},
  },
});

export default submissionEdited;
