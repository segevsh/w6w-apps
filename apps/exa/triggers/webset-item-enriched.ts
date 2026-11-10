import { webhookTrigger } from "../lib/triggers.ts";

/** Exa finishes enriching an item of a Webset. */
const websetItemEnriched = webhookTrigger({
  key: "webset-item-enriched",
  title: "Webset Item Enriched",
  description:
    "Fires when Exa finishes an enrichment on a Webset item. The run gets the event id, the Webset and item ids and the item with its enrichment results.",
  eventType: "webset.item.enriched",
  sample: {
    eventId: "event_01k8w6w000000000000000003",
    type: "webset.item.enriched",
    createdAt: "2026-11-10T09:31:00.000Z",
    websetId: "webset_01k8w6w000000000000000001",
    itemId: "witem_01k8w6w000000000000000002",
    data: {
      id: "witem_01k8w6w000000000000000002",
      object: "webset_item",
      source: "search",
      websetId: "webset_01k8w6w000000000000000001",
      properties: { type: "company", url: "https://example.com" },
      evaluations: [],
      enrichments: [{ enrichmentId: "wenrich_1", status: "completed", result: ["Boston"] }],
      createdAt: "2026-11-10T09:30:00.000Z",
      updatedAt: "2026-11-10T09:31:00.000Z",
    },
  },
});

export default websetItemEnriched;
