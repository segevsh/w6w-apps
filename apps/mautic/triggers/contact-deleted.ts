import { webhookTrigger } from "../lib/triggers.ts";

/** A Mautic webhook on `mautic.lead_post_delete`. */
export default webhookTrigger({
  key: "contact-deleted",
  title: "Contact Deleted",
  description:
    "Fires when a contact is deleted in Mautic. The run gets the id of the deleted contact.",
  event: "mautic.lead_post_delete",
  idOf: (p) => p.id ?? (p.contact as { id?: unknown } | undefined)?.id,
  sample: {
    event: "mautic.lead_post_delete",
    timestamp: "2026-11-09T09:30:01+00:00",
    resourceId: "42",
    resource: {
      id: 42,
      contact: { id: null },
      timestamp: "2026-11-09T09:30:01+00:00",
    },
  },
});
