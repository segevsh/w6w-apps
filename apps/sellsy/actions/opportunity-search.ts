import { searchAction } from "../lib/actions.ts";

export default searchAction({
  "key": "opportunity",
  "noun": "opportunities",
  "path": "/opportunities",
  "scope": "opportunities.read",
  "orders": [
    "id",
    "created",
    "step_rank",
    "due_date",
    "amount",
  ],
  "embeds": [
    "estimates",
    "individual",
    "invoices",
    "orders",
    "deliveries",
    "company",
    "contacts",
    "assigned_staffs",
  ],
  "filters": [
    {
      "key": "name",
      "label": "Name",
    },
    {
      "key": "number",
      "label": "Number",
    },
    {
      "key": "pipeline",
      "label": "Pipeline IDs",
      "as": "intList",
      "hint": "Comma-separated.",
    },
    {
      "key": "step",
      "label": "Step IDs",
      "as": "intList",
      "hint": "Comma-separated.",
    },
    {
      "key": "statuses",
      "label": "Statuses",
      "as": "strList",
      "hint": "Comma-separated: open, won, lost, cancelled, closed, late.",
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
  ],
});
