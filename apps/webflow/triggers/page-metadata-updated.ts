import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "page-metadata-updated",
  title: "Page Metadata Updated",
  description:
    "Fires when a page's metadata or settings are updated and published. The run gets the page id, title and path.",
  triggerType: "page_metadata_updated",
});
