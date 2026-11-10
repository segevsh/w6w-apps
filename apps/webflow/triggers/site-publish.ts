import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "site-publish",
  title: "Site Published",
  description:
    "Fires when the site is published. The run gets the published domains, who published it and when.",
  triggerType: "site_publish",
});
