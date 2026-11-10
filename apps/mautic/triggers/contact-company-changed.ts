import { webhookTrigger } from "../lib/triggers.ts";

/** A Mautic webhook on `mautic.lead_company_change`. */
export default webhookTrigger({
  key: "contact-company-changed",
  title: "Contact Company Changed",
  description:
    "Fires when a contact is added to or removed from a company. The run gets the contact, the company and whether it was added.",
  event: "mautic.lead_company_change",
  idOf: (p) => (p.contact as { id?: unknown } | undefined)?.id,
  sample: {
    "event": "mautic.lead_company_change",
    "timestamp": "2026-11-10T09:30:01+00:00",
    "resourceId": "42",
    "resource": {
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
      "company": { "id": 5, "fields": { "core": { "companyname": { "value": "Acme" } } } },
      "added": true,
      "timestamp": "2026-11-10T09:30:01+00:00",
    },
  },
});
