import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "collection-item-unpublished",
  title: "Collection Item Unpublished",
  description:
    "Fires when a CMS item is taken off the live site. The run gets the item id, its collection and site, and the field data.",
  triggerType: "collection_item_unpublished",
});
