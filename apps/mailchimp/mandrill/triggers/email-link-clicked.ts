import { webhookTrigger } from "../lib/triggers.ts";

/** Mandrill message event(s): click. */
const emailLinkClicked = webhookTrigger({
  key: "email-link-clicked",
  title: "Email Link Clicked",
  description:
    "Fires when a recipient clicks a tracked link (event click). The run gets the event, event time, message id, recipient, subject, sender, state, tags, clicked URL, reason, metadata and the full event data.",
  events: ["click"],
});

export default emailLinkClicked;
