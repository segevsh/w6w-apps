import { webhookTrigger } from "../lib/triggers.ts";

/** A Mautic webhook on `mautic.email_on_send`. */
export default webhookTrigger({
  key: "email-sent",
  title: "Email Sent",
  description:
    "Fires when Mautic sends an email to a contact. The run gets the email, the contact, the rendered subject and the sent HTML.",
  event: "mautic.email_on_send",
  idOf: (p) => (p.contact as { id?: unknown } | undefined)?.id,
  sample: {
    "event": "mautic.email_on_send",
    "timestamp": "2026-11-10T09:30:01+00:00",
    "resourceId": "42",
    "resource": {
      "email": { "id": 9, "name": "Welcome" },
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
      "subject": "Welcome, Jackie",
      "content": "<p>Hi</p>",
      "idHash": "sample-id-hash",
      "timestamp": "2026-11-10T09:30:01+00:00",
    },
  },
});
