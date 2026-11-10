import { pollFromListAction } from "../../_shared/poll/mod.ts";
import contactList from "../actions/contact-list.ts";
import { organizationId } from "../lib/params.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly modified Zoho Books contact.",
  action: contactList,
  params: [organizationId],
  input: (params: { organizationId?: string }) => ({
    organizationId: params.organizationId,
    page: 1,
    per_page: 100,
    sort_column: "last_modified_time",
    sort_order: "descending",
  }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { contact_id?: unknown }).contact_id ?? ""),
  output: [{ key: "contact_id", type: "string", label: "Contact ID" }],
  sample: { contact_id: "contact-1", contact_name: "Acme" },
  maxPages: 1,
});
