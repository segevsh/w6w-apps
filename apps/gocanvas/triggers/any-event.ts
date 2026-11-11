import { anyEventTrigger } from "../lib/triggers.ts";

/** Any GoCanvas webhook event, chosen by the `events` param (empty = all five). */
const anyEvent = anyEventTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on the GoCanvas webhook events you list (submission_create, submission_edit, dispatch_create, workflow_handoff_create, submission_custom_status_change), or on all five when the list is empty, for one form or company-wide. Registers one GoCanvas webhook per event. The run gets the event type, the form id and the delivery payload as GoCanvas sent it.",
  sample: {
    eventType: "submission_create",
    formId: "346127",
    payload: {},
  },
});

export default anyEvent;
