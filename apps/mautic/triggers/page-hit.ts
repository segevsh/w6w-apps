import { webhookTrigger } from "../lib/triggers.ts";

/** A Mautic webhook on `mautic.page_on_hit`. */
export default webhookTrigger({
  key: "page-hit",
  title: "Page Hit",
  description:
    "Fires when a contact visits a landing page or a tracked web page. The run gets the page visit (page, contact, location).",
  event: "mautic.page_on_hit",
  idOf: (p) => (p.hit as { id?: unknown } | undefined)?.id,
  sample: {
    "event": "mautic.page_on_hit",
    "timestamp": "2026-11-10T09:30:01+00:00",
    "resourceId": "88",
    "resource": {
      "hit": {
        "id": 88,
        "page": { "id": 2, "title": "Pricing" },
        "lead": { "id": 42 },
        "country": "United States",
        "city": "Austin",
      },
      "timestamp": "2026-11-10T09:30:01+00:00",
    },
  },
});
