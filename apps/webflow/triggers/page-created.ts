import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "page-created",
  title: "Page Created",
  description:
    "Fires when a page is created on the site. The run gets the page id, title and path.",
  triggerType: "page_created",
});
