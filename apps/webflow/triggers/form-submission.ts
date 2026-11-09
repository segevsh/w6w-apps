import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "form-submission",
  title: "Form Submission",
  description:
    "Fires when a form on a Webflow site is submitted. The run gets the form name, the submitted fields and when it was submitted.",
  triggerType: "form_submission",
});
