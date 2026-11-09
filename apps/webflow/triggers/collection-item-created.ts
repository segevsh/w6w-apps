import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "collection-item-created",
  title: "Collection Item Created",
  description:
    "Fires when an item is created in a Webflow CMS collection. The run gets the item, its collection and its field data.",
  triggerType: "collection_item_created",
});
