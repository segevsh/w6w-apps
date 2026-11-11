import { snapshotTrigger } from "../lib/triggers.ts";
import contactsList from "../actions/contacts-list.ts";

export default snapshotTrigger({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each shared company contact newly added in Dialpad.",
  action: contactsList,
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "display_name", type: "string", label: "Display name" },
    { key: "phones", type: "array", label: "Phone numbers" },
    { key: "emails", type: "array", label: "Email addresses" },
    { key: "company_name", type: "string", label: "Company" },
  ],
  sample: {
    id: "7001",
    display_name: "Grace Hopper",
    phones: ["+15555550100"],
    emails: ["grace@example.com"],
    company_name: "Example Co",
  },
});
