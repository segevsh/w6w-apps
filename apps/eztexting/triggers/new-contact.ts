import { pollFromListAction } from "../../_shared/poll/mod.ts";
import contactList from "../actions/contact-list.ts";

export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly listed contact.",
  action: contactList,
  input: () => ({ page: 0, size: "100", sort: "createdAt:DESC" }),
  items: (result) =>
    Array.isArray((result as { content?: unknown[] }).content)
      ? (result as { content: unknown[] }).content
      : [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; contactId?: unknown }).id ??
        (item as { contactId?: unknown }).contactId ?? "",
    ),
  output: [{ key: "id", type: "number", label: "Contact ID" }],
  sample: { id: 101 },
  maxPages: 1,
});
