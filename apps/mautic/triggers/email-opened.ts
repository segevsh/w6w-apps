import { webhookTrigger } from "../lib/triggers.ts";

/** A Mautic webhook on `mautic.email_on_open`. */
export default webhookTrigger({
  key: "email-opened",
  title: "Email Opened",
  description:
    "Fires when a contact presumably opens an email (tracking pixels can be loaded by proxies and bots). The run gets the email and the contact.",
  event: "mautic.email_on_open",
  idOf: (p) => (p.contact as { id?: unknown } | undefined)?.id,
  sample: {
    "event": "mautic.email_on_open",
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
      "idHash": "sample-id-hash",
      "timestamp": "2026-11-10T09:30:01+00:00",
    },
  },
});
