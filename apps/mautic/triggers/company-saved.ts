import { webhookTrigger } from "../lib/triggers.ts";

/** A Mautic webhook on `mautic.company_post_save`. */
export default webhookTrigger({
  key: "company-saved",
  title: "Company Created or Updated",
  description:
    "Fires when a company is created or updated in Mautic. The run gets the company as it is after the save.",
  event: "mautic.company_post_save",
  idOf: (p) => (p.company as { id?: unknown } | undefined)?.id,
  sample: {
    "event": "mautic.company_post_save",
    "timestamp": "2026-11-10T09:30:01+00:00",
    "resourceId": "5",
    "resource": {
      "company": { "id": 5, "fields": { "core": { "companyname": { "value": "Acme" } } } },
      "timestamp": "2026-11-10T09:30:01+00:00",
    },
  },
});
