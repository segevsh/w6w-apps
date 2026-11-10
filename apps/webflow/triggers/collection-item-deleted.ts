import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "collection-item-deleted",
  title: "Collection Item Deleted",
  description:
    "Fires when a CMS item is deleted from a collection. The run gets the item id, its collection and site, and the item as it was.",
  triggerType: "collection_item_deleted",
});
