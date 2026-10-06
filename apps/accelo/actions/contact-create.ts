import { createAction } from "../lib/actions.ts";

export default createAction({
  key: "contact-create",
  resource: "contact",
  path: "/contacts",
  title: "Create Contact",
  description:
    "Create a contact and, in the same call, its affiliation with a company (company id, phone, email, position).",
  fields: [
    { key: "firstname", wire: "firstname", label: "First name", required: true, row: "name" },
    { key: "surname", wire: "surname", label: "Surname", required: true, row: "name" },
    { key: "middlename", wire: "middlename", label: "Middle name", advanced: true },
    { key: "title", wire: "title", label: "Title", advanced: true, hint: "Honorific, e.g. Dr." },
    {
      key: "companyId",
      wire: "company_id",
      label: "Company ID",
      type: "number",
      hint: "The company the new affiliation is with. Must be a valid company.",
    },
    { key: "email", wire: "email", label: "Email", row: "affiliation", hint: "Affiliation email." },
    { key: "phone", wire: "phone", label: "Phone", row: "affiliation", hint: "Affiliation phone." },
    { key: "position", wire: "position", label: "Position", advanced: true },
    { key: "comments", wire: "comments", label: "Comments", type: "text", advanced: true },
  ],
});
