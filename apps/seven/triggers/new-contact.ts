import { pollFromListAction } from "../../_shared/poll/mod.ts";
import contactList from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "Polls the newest seven contacts from contact-list.",
  action: contactList,
  input: (params) => ({
    ...params,
    order_by: "created",
    order_direction: "desc",
    limit: 100,
    offset: 0,
  }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id: string | number }).id),
  params: contactList.params,
  output: [{ key: "id", type: "number", label: "Contact ID" }],
  sample: { id: 123, firstname: "Ada" },
  maxPages: 1,
});
