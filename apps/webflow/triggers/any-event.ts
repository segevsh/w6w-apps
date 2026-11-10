import { anyEventTrigger } from "../lib/triggers.ts";

export default anyEventTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on any Webflow site event you choose (form submissions, CMS item created, changed, deleted, published or unpublished, orders, inventory, site publishes, pages, comments). Leave Events blank for every event except the Designer branch ones. The run gets the event name, the site, collection and item ids where the payload has them, and the full payload.",
});
