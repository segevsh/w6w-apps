import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-list.ts";

interface Contact {
  ContactID?: string;
  UpdatedDateUTC?: string;
}

export default pollFromListAction({
  key: "new-or-updated-contact",
  title: "New or Updated Contact",
  description:
    "The run gets each contact that is created or edited in the Xero organisation (newest change first, one page per check).",
  action,
  input: () => ({ order: "UpdatedDateUTC DESC", page: 1 }),
  items: (result) => (result as { Contacts?: unknown[] }).Contacts ?? [],
  idOf: (item) => {
    const c = item as Contact;
    return `${c.ContactID ?? ""}:${c.UpdatedDateUTC ?? ""}`;
  },
  output: [
    { key: "ContactID", type: "string", label: "Contact ID" },
    { key: "Name", type: "string", label: "Name" },
    { key: "EmailAddress", type: "string", label: "Email address" },
    { key: "ContactStatus", type: "string", label: "Status" },
    { key: "UpdatedDateUTC", type: "string", label: "Last updated (UTC)" },
  ],
  sample: {
    ContactID: "a1b2c3d4-0000-4000-8000-000000000001",
    Name: "Ridgeway University",
    EmailAddress: "accounts@example.com",
    ContactStatus: "ACTIVE",
    UpdatedDateUTC: "/Date(1731153600000+0000)/",
  },
});
