import contactsList from "../actions/contacts-list.ts";
import { orgWindowTrigger } from "../lib/org-window.ts";

export default orgWindowTrigger({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each contact your organization researches, since the last check.",
  action: contactsList,
  idField: "contactId",
  output: [
    { key: "contactId", type: "string", label: "Contact ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "title", type: "string", label: "Job title" },
    { key: "company", type: "string", label: "Company" },
    { key: "researchedAt", type: "string", label: "Researched at" },
  ],
  sample: {
    contactId: "48213377",
    firstName: "Dana",
    lastName: "Reyes",
    title: "VP of Sales",
    company: "Acme",
    researchedAt: "2026-11-10T09:00:00.000Z",
  },
});
