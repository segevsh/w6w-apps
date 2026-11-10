import { submissionTrigger } from "../lib/triggers.ts";

/** A Netlify form submission (Forms > Submission notifications > Outgoing webhook). */
const submissionCreated = submissionTrigger({
  key: "submission-created",
  title: "Form Submission Received",
  description:
    "Fires when a Netlify form receives a verified submission (point a Form submission outgoing webhook at it). The run gets the submitter, the form fields and the submission.",
});

export default submissionCreated;
