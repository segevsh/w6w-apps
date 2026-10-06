import { writeAction } from "../lib/actions.ts";

export default writeAction({
  "key": "contact",
  "noun": "contact",
  "path": "/contacts",
  "scope": "contacts.write",
  "resultKey": "contact",
  "mode": "create",
  "fields": [
    {
      "key": "last_name",
      "label": "Last name",
      "required": true,
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
      "key": "position",
      "label": "Position",
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
