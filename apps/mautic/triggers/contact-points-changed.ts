import { webhookTrigger } from "../lib/triggers.ts";

/** A Mautic webhook on `mautic.lead_points_change`. */
export default webhookTrigger({
  key: "contact-points-changed",
  title: "Contact Points Changed",
  description:
    "Fires when a contact's points change. The run gets the contact and the old and new points.",
  event: "mautic.lead_points_change",
  idOf: (p) => (p.contact as { id?: unknown } | undefined)?.id,
  sample: {
    "event": "mautic.lead_points_change",
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
      "points": { "old_points": 0, "new_points": 10 },
      "timestamp": "2026-11-10T09:30:01+00:00",
    },
  },
});
