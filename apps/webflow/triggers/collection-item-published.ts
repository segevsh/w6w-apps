import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "collection-item-published",
  title: "Collection Item Published",
  description:
    "Fires when a CMS item is published to the live site. The run gets the item id, its collection and site, and the published field data.",
  triggerType: "collection_item_published",
});
