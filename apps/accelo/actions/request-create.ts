import { createAction } from "../lib/actions.ts";

export default createAction({
  key: "request-create",
  resource: "request",
  path: "/requests",
  title: "Create Request",
  description:
    "Log an inbound client request. Pass an affiliation id, or let Accelo match or create one from the name, company and email.",
  fields: [
    { key: "title", wire: "title", label: "Title", required: true },
    { key: "body", wire: "body", label: "Body", type: "text" },
    { key: "typeId", wire: "type_id", label: "Request type ID", type: "number", required: true },
    {
      key: "affiliationId",
      wire: "affiliation_id",
      label: "Affiliation ID",
      type: "number",
      hint: "Leave empty to have Accelo link or create one from the fields below.",
    },
    {
      key: "contactFirstname",
      wire: "affiliation_contact_firstname",
      label: "Contact first name",
      row: "who",
      advanced: true,
    },
    {
      key: "contactSurname",
      wire: "affiliation_contact_surname",
      label: "Contact surname",
      row: "who",
      advanced: true,
    },
    { key: "companyName", wire: "affiliation_company_name", label: "Company name", advanced: true },
    { key: "email", wire: "affiliation_email", label: "Email", row: "reach", advanced: true },
    { key: "phone", wire: "affiliation_phone", label: "Phone", row: "reach", advanced: true },
    {
      key: "priorityId",
      wire: "priority_id",
      label: "Priority ID",
      type: "number",
      advanced: true,
    },
  ],
});
