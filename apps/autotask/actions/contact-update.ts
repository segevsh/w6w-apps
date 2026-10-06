import { writeAction } from "../lib/factory.ts";

/** `PATCH /Companies/{companyID}/Contacts` — change only the fields sent. */
export default writeAction({
  key: "contact-update",
  title: "Update contact",
  description:
    "Change the fields you send on a contact (PATCH). The contact's company id is needed " +
    "because the vendor only exposes contact writes under the parent company.",
  resource: "contact",
  method: "PATCH",
  path: (companyId) => `/Companies/${companyId}/Contacts`,
  parent: { key: "companyID", label: "Company ID", type: "number" },
  fields: [
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "isActive", label: "Active (1 = yes, 0 = no)", type: "number" },
    { key: "emailAddress", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "mobilePhone", label: "Mobile phone", type: "string" },
    { key: "title", label: "Job title", type: "string" },
    { key: "addressLine", label: "Address", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State", type: "string" },
    { key: "zipCode", label: "Postal code", type: "string" },
    { key: "note", label: "Note", type: "text" },
    { key: "primaryContact", label: "Primary contact", type: "boolean" },
  ],
});
