import { searchAction } from "../lib/actions.ts";

export default searchAction({
  "key": "task",
  "noun": "tasks",
  "path": "/tasks",
  "scope": "tasks.read",
  "orders": [
    "id",
    "due_date",
  ],
  "embeds": [
    "owner",
    "assigned_staffs",
    "related",
    "company",
    "individual",
    "contact",
  ],
  "filters": [
    {
      "key": "statuses",
      "label": "Statuses",
      "as": "strList",
      "hint": "Comma-separated: todo, done.",
    },
    {
      "key": "labels",
      "label": "Label IDs",
      "as": "intList",
      "hint": "Comma-separated.",
    },
    {
      "key": "assigned_staffs",
      "label": "Assigned staff IDs",
      "as": "intList",
      "hint": "Comma-separated.",
    },
    {
      "key": "owners",
      "label": "Owner IDs",
      "as": "intList",
      "hint": "Comma-separated.",
    },
    {
      "key": "companies",
      "label": "Company IDs",
      "as": "intList",
      "hint": "Comma-separated.",
    },
    {
      "key": "individuals",
      "label": "Individual IDs",
      "as": "intList",
      "hint": "Comma-separated.",
    },
    {
      "key": "contacts",
      "label": "Contact IDs",
      "as": "intList",
      "hint": "Comma-separated.",
    },
  ],
});
