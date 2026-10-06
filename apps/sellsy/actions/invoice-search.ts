import { searchAction } from "../lib/actions.ts";

export default searchAction({
  "key": "invoice",
  "noun": "invoices",
  "path": "/invoices",
  "scope": "invoices.read",
  "orders": [
    "id",
    "number",
    "created",
    "date",
    "amount",
    "due_date",
  ],
  "embeds": [
    "company",
    "individual",
    "contact",
    "invoicing_address",
    "delivery_address",
    "smart_tags",
  ],
  "filters": [
    {
      "key": "status",
      "label": "Statuses",
      "as": "strList",
      "hint": "Comma-separated: draft, due, payinprogress, paid, late, cancelled.",
    },
    {
      "key": "number",
      "label": "Number",
    },
    {
      "key": "currency",
      "label": "Currency",
    },
    {
      "key": "owners",
      "label": "Owner IDs",
      "as": "intList",
      "hint": "Comma-separated.",
    },
    {
      "key": "contacts",
      "label": "Contact IDs",
      "as": "intList",
      "hint": "Comma-separated.",
    },
    {
      "key": "assigned_staff_ids",
      "label": "Assigned staff IDs",
      "as": "intList",
      "hint": "Comma-separated.",
    },
    {
      "key": "is_deposit",
      "label": "Deposit invoices only",
      "as": "bool",
    },
  ],
});
