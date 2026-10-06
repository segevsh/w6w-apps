import { writeAction } from "../lib/actions.ts";

export default writeAction({
  "key": "individual",
  "noun": "individual",
  "path": "/individuals",
  "scope": "individuals.write",
  "resultKey": "individual",
  "mode": "update",
  "fields": [
    {
      "key": "last_name",
      "label": "Last name",
    },
    {
      "key": "first_name",
      "label": "First name",
    },
    {
      "key": "civility",
      "label": "Civility",
      "options": [
        "mr",
        "mrs",
        "ms",
      ],
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
  ],
});
