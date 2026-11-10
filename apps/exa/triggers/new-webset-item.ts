import { webhookTrigger } from "../lib/triggers.ts";

/** Exa finds a new item (a company, person, article, ...) for a Webset. */
const newWebsetItem = webhookTrigger({
  key: "new-webset-item",
  title: "New Webset Item",
  description:
    "Fires when a Webset adds a new item. The run gets the event id, the Webset and item ids and the item itself (its properties, criteria evaluations and any enrichments done so far).",
  eventType: "webset.item.created",
  sample: {
    eventId: "event_01k8w6w000000000000000000",
    type: "webset.item.created",
    createdAt: "2026-11-10T09:30:00.000Z",
    websetId: "webset_01k8w6w000000000000000001",
    itemId: "witem_01k8w6w000000000000000002",
    data: {
      id: "witem_01k8w6w000000000000000002",
      object: "webset_item",
      source: "search",
      websetId: "webset_01k8w6w000000000000000001",
      properties: {
        type: "company",
        url: "https://example.com",
        description: "Example Co makes consumer goods.",
        company: { name: "Example Co" },
      },
      evaluations: [],
      enrichments: [],
      createdAt: "2026-11-10T09:30:00.000Z",
      updatedAt: "2026-11-10T09:30:00.000Z",
    },
  },
});

export default newWebsetItem;
