import action from "../actions/item-filter.ts";
import { itemFeed } from "../lib/triggers.ts";

export default itemFeed({
  key: "new-item",
  title: "New Item",
  description: "The run gets each item newly created in the chosen Podio app, newest first.",
  action,
  sortBy: "created_on",
  output: [
    { key: "item_id", type: "number", label: "Item ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "created_on", type: "string", label: "Created on" },
    { key: "fields", type: "array", label: "Field values" },
  ],
  sample: {
    item_id: 4012345,
    title: "Acme renewal",
    created_on: "2026-11-10 09:00:00",
    last_edit_on: "2026-11-10 09:00:00",
    fields: [],
  },
});
