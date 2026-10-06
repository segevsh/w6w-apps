import { updateAction } from "../lib/actions.ts";

export default updateAction({
  key: "contact-update",
  resource: "contact",
  path: "/contacts",
  idKey: "contactId",
  idLabel: "Contact ID",
  title: "Update Contact",
  description:
    "Change a contact's name, title, comments or standing. Phone, email and address belong to the affiliation, not the contact.",
  fields: [
    { key: "firstname", wire: "firstname", label: "First name", row: "name" },
    { key: "surname", wire: "surname", label: "Surname", row: "name" },
    { key: "middlename", wire: "middlename", label: "Middle name", advanced: true },
    { key: "title", wire: "title", label: "Title", advanced: true },
    { key: "comments", wire: "comments", label: "Comments", type: "text" },
    {
      key: "standing",
      wire: "standing",
      label: "Standing",
      advanced: true,
      hint: "Send either this or a status id, not both.",
    },
  ],
});
