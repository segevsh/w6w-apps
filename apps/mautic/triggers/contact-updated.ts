import { webhookTrigger } from "../lib/triggers.ts";

/** A Mautic webhook on `mautic.lead_post_save_update`. */
export default webhookTrigger({
  key: "contact-updated",
  title: "Contact Updated",
  description:
    "Fires when a contact is updated in Mautic. The run gets the contact as it is after the update.",
  event: "mautic.lead_post_save_update",
  idOf: (p) => (p.contact as { id?: unknown } | undefined)?.id,
  sample: {
    event: "mautic.lead_post_save_update",
    timestamp: "2026-11-09T09:30:01+00:00",
    resourceId: "42",
    resource: {
      contact: {
        id: 42,
        points: 0,
        dateAdded: "2026-11-09T09:30:00+00:00",
        fields: {
          core: { firstname: { value: "Jackie" }, email: { value: "jackie@example.com" } },
        },
        tags: [],
      },
      timestamp: "2026-11-09T09:30:01+00:00",
    },
  },
});
