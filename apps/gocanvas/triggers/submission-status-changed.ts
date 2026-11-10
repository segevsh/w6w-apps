import { webhookTrigger } from "../lib/triggers.ts";

/** A submission's custom status changes (event type `submission_custom_status_change`). */
const submissionStatusChanged = webhookTrigger({
  key: "submission-status-changed",
  title: "Submission Status Changed",
  description:
    "Fires when a submission's custom status changes in GoCanvas (event type submission_custom_status_change), for one form or company-wide; Submission Status has to be enabled on the form. The run gets the event type, the form id and the delivery payload as GoCanvas sent it.",
  eventType: "submission_custom_status_change",
  sample: {
    eventType: "submission_custom_status_change",
    formId: "346127",
    payload: {},
  },
});

export default submissionStatusChanged;
