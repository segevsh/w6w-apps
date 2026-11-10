import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "Polls the existing contact-list action ordered by creation time descending.",
  action,
  input: () => ({ order: "CreatedDateUTC DESC", page: 1 }),
  items: (result) => (result as { Contacts?: unknown[] }).Contacts ?? [],
  idOf: (item) => String((item as { ContactID?: unknown }).ContactID ?? ""),
  output: [{ key: "ContactID", type: "string", label: "Contact ID" }],
  sample: { ContactID: "contact-101" },
});
