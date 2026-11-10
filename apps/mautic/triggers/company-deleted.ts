import { webhookTrigger } from "../lib/triggers.ts";

/** A Mautic webhook on `mautic.company_post_delete`. */
export default webhookTrigger({
  key: "company-deleted",
  title: "Company Deleted",
  description:
    "Fires when a company is deleted in Mautic. The run gets the deleted company's id (the company object's own id is null).",
  event: "mautic.company_post_delete",
  idOf: (p) => p.id,
  sample: {
    "event": "mautic.company_post_delete",
    "timestamp": "2026-11-10T09:30:01+00:00",
    "resourceId": "5",
    "resource": { "id": 5, "company": { "id": null }, "timestamp": "2026-11-10T09:30:01+00:00" },
  },
});
