import action from "../actions/item-filter.ts";
import { itemFeed } from "../lib/triggers.ts";

export default itemFeed({
  key: "new-or-updated-item",
  title: "New or Updated Item",
  description:
    "The run gets each item created or edited in the chosen Podio app, most recently edited first. Fires once per edit.",
  action,
  sortBy: "last_edit_on",
  output: [
    { key: "item_id", type: "number", label: "Item ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "last_edit_on", type: "string", label: "Last edited on" },
    { key: "fields", type: "array", label: "Field values" },
  ],
  sample: {
    item_id: 4012345,
    title: "Acme renewal",
    created_on: "2026-11-09 09:00:00",
    last_edit_on: "2026-11-10 09:00:00",
    fields: [],
  },
});
