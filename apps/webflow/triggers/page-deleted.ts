import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "page-deleted",
  title: "Page Deleted",
  description:
    "Fires when a page is deleted from the site. The run gets the page id, title and path.",
  triggerType: "page_deleted",
});
