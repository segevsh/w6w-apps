import { searchAction } from "../lib/actions.ts";

export default searchAction({
  "key": "estimate",
  "noun": "estimates",
  "path": "/estimates",
  "scope": "estimates.read",
  "orders": [
    "id",
    "number",
    "created",
    "date",
    "expiry_date",
    "amount",
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
      "hint":
        "Comma-separated: draft, sent, read, accepted, refused, expired, advanced, partialinvoiced, invoiced, cancelled.",
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
  ],
});
