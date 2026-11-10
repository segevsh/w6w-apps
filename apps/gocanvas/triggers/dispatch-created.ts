import { webhookTrigger } from "../lib/triggers.ts";

/** A dispatch is created (event type `dispatch_create`). */
const dispatchCreated = webhookTrigger({
  key: "dispatch-created",
  title: "New Dispatch",
  description:
    "Fires when a dispatch is created in GoCanvas (event type dispatch_create), for one form or company-wide; Dispatch has to be enabled on the form. The run gets the event type, the form id and the delivery payload as GoCanvas sent it.",
  eventType: "dispatch_create",
  sample: {
    eventType: "dispatch_create",
    formId: "346127",
    payload: {},
  },
});

export default dispatchCreated;
