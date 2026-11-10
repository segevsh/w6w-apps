import { anyEventTrigger } from "../lib/triggers.ts";

export default anyEventTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on any Mautic webhook event type you list in Events (empty = every event in Mautic's webhook catalog). The run gets one event per payload: the event type, time, record id and the payload.",
  sample: {
    "event": "mautic.form_on_submit",
    "timestamp": "2026-11-10T09:30:01+00:00",
    "resourceId": "7",
    "resource": {
      "submission": {
        "id": 7,
        "form": { "id": 3, "name": "Newsletter signup" },
        "lead": { "id": 42 },
      },
      "timestamp": "2026-11-10T09:30:01+00:00",
    },
  },
});
