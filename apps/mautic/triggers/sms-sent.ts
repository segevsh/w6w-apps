import { webhookTrigger } from "../lib/triggers.ts";

/** A Mautic webhook on `mautic.sms_on_send`. */
export default webhookTrigger({
  key: "sms-sent",
  title: "Text Message Sent",
  description:
    "Fires when Mautic sends a text message to a contact. The run gets the SMS id, the contact and the content.",
  event: "mautic.sms_on_send",
  idOf: (p) => (p.contact as { id?: unknown } | undefined)?.id,
  sample: {
    "event": "mautic.sms_on_send",
    "timestamp": "2026-11-10T09:30:01+00:00",
    "resourceId": "42",
    "resource": {
      "smsId": 3,
      "contact": {
        "id": 42,
        "points": 0,
        "fields": {
          "core": {
            "firstname": { "value": "Jackie" },
            "email": { "value": "jackie@example.com" },
          },
        },
        "tags": [],
      },
      "content": "Hi Jackie",
      "timestamp": "2026-11-10T09:30:01+00:00",
    },
  },
});
