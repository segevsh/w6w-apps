import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "collection-item-changed",
  title: "Collection Item Changed",
  description:
    "Fires when an item in a Webflow CMS collection is updated. The run gets the changed item and its field data.",
  triggerType: "collection_item_changed",
});
