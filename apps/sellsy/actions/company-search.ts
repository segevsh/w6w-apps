import { searchAction } from "../lib/actions.ts";

export default searchAction({
  "key": "company",
  "noun": "companies",
  "path": "/companies",
  "scope": "companies.read",
  "orders": [
    "name",
    "id",
    "created_at",
    "updated_at",
  ],
  "embeds": [
    "invoicing_address",
    "delivery_address",
    "main_contact",
    "opportunities",
    "smart_tags",
    "owner",
  ],
  "filters": [
    {
      "key": "name",
      "label": "Name",
    },
    {
      "key": "email",
      "label": "Email",
    },
    {
      "key": "type",
      "label": "Type",
      "options": [
        "prospect",
        "client",
        "supplier",
      ],
    },
    {
      "key": "is_archived",
      "label": "Archived",
      "as": "bool",
    },
    {
      "key": "siret",
      "label": "SIRET",
    },
    {
      "key": "vat",
      "label": "VAT number",
    },
    {
      "key": "id",
      "label": "IDs",
      "as": "intList",
      "hint": "Comma-separated company IDs.",
    },
    {
      "key": "country_code",
      "label": "Country code",
    },
    {
      "key": "reference",
      "label": "References",
      "as": "strList",
      "hint": "Comma-separated.",
    },
  ],
});
