import { searchAction } from "../lib/actions.ts";

export default searchAction({
  "key": "item",
  "noun": "catalogue items",
  "path": "/items",
  "scope": "items.read",
  "orders": [
    "id",
    "created_at",
  ],
  "filters": [
    {
      "key": "type",
      "label": "Types",
      "as": "strList",
      "hint": "Comma-separated: product, service, shipping, packaging.",
    },
    {
      "key": "name",
      "label": "Name",
    },
    {
      "key": "reference",
      "label": "Reference",
    },
    {
      "key": "is_archived",
      "label": "Archived",
      "as": "bool",
    },
  ],
});
