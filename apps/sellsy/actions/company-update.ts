import { writeAction } from "../lib/actions.ts";

export default writeAction({
  "key": "company",
  "noun": "company",
  "path": "/companies",
  "scope": "companies.write",
  "resultKey": "company",
  "mode": "update",
  "fields": [
    {
      "key": "name",
      "label": "Name",
    },
    {
      "key": "email",
      "label": "Email",
    },
    {
      "key": "website",
      "label": "Website",
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
      "key": "reference",
      "label": "Reference",
    },
    {
      "key": "note",
      "label": "Note",
    },
    {
      "key": "owner_id",
      "label": "Owner (staff ID)",
      "as": "int",
    },
    {
      "key": "legal_france",
      "label": "French legal info (JSON)",
      "as": "json",
      "hint": 'e.g. {"siret":"12345678901234","vat":"FR12345678901"}',
    },
    {
      "key": "social",
      "label": "Social profiles (JSON)",
      "as": "json",
      "hint": 'e.g. {"linkedin":"https://…"}',
    },
  ],
});
