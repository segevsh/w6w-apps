import { webhookTrigger } from "../lib/triggers.ts";

/** A visitor submits the form and Formspark accepts the submission. */
const newSubmission = webhookTrigger({
  key: "new-submission",
  title: "New Submission",
  description:
    "Fires when a form receives a submission Formspark accepts (spam and over-quota submissions are not delivered). The run gets the submission id, the time Formspark sent it and the submitted fields.",
  sample: {
    submissionId: "sample-submission-id",
    sentAt: "2026-11-10T09:30:00.000Z",
    fields: { email: "kramer@nineties.sitcom", message: "Who turns down a Junior Mint?" },
  },
});

export default newSubmission;
