import { writeAction } from "../lib/factory.ts";

/**
 * `POST /Companies/{companyID}/Contacts` — create a contact under a company.
 *
 * Contacts have no root `POST`: the swagger lists `/Contacts` as query and read-by-id only, and
 * create and update live under the parent company. The vendor's Contacts page marks `firstName`,
 * `lastName` and `isActive` required; `isActive` is an INTEGER here (1 = active), unlike the
 * boolean on Companies.
 */
export default writeAction({
  key: "contact-create",
  title: "Create contact",
  description:
    "Create a contact under a company. `isActive` is an integer on this entity (1 = active).",
  resource: "contact",
  method: "POST",
  path: (companyId) => `/Companies/${companyId}/Contacts`,
  parent: { key: "companyID", label: "Company ID", type: "number" },
  fields: [
    { key: "firstName", label: "First name", type: "string", required: true },
    { key: "lastName", label: "Last name", type: "string", required: true },
    { key: "isActive", label: "Active (1 = yes, 0 = no)", type: "number", required: true },
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
