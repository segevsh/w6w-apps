import { webhookTrigger } from "../lib/triggers.ts";

/** A Mautic webhook on `mautic.lead_post_save_new`. */
export default webhookTrigger({
  key: "new-contact",
  title: "New Contact",
  description:
    "Fires when Mautic identifies a new contact. The run gets the contact (fields, points, tags).",
  event: "mautic.lead_post_save_new",
  idOf: (p) => (p.contact as { id?: unknown } | undefined)?.id,
  sample: {
    event: "mautic.lead_post_save_new",
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
