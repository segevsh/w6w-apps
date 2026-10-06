import { searchAction } from "../lib/actions.ts";

export default searchAction({
  "key": "contact",
  "noun": "contacts",
  "path": "/contacts",
  "scope": "contacts.read",
  "orders": [
    "id",
    "name",
    "created_at",
  ],
  "embeds": [
    "invoicing_address",
    "delivery_address",
    "opportunities",
    "smart_tags",
    "owner",
  ],
  "filters": [
    {
      "key": "last_name",
      "label": "Last name",
    },
    {
      "key": "email",
      "label": "Email",
    },
    {
      "key": "phone_number",
      "label": "Phone",
    },
    {
      "key": "mobile_number",
      "label": "Mobile",
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
      "key": "id",
      "label": "IDs",
      "as": "intList",
      "hint": "Comma-separated contact IDs.",
    },
  ],
});
