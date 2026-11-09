import { pollFromListAction } from "../../_shared/poll/mod.ts";
import contactList from "../actions/contact-list.ts";

export default pollFromListAction<{ campaignId?: string }>({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each contact newly added to the selected GetResponse campaign.",
  action: contactList,
  input: (params) => ({
    campaignId: params.campaignId,
    sortBy: "createdOn",
    sortDirection: "DESC",
    page: 1,
    perPage: 100,
  }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { contactId?: unknown }).contactId ?? ""),
  params: [{ key: "campaignId", label: "Campaign ID", type: "string" }],
  output: [
    { key: "contactId", type: "string", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: { contactId: "contact_123", email: "ada@example.test" },
});
