import { pollFromListAction } from "../../_shared/poll/mod.ts";
import contactList from "../actions/contact-list.ts";
export default pollFromListAction({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each newly created contact.",
  action: contactList,
  input: (p: { createdSince: string }) => ({ createdSince: p.createdSince, limit: 100 }),
  params: [{ key: "createdSince", label: "Created since", type: "datetime", required: true }],
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (v) => String((v as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Contact ID" }],
  sample: { id: 1 },
  maxPages: 1,
});
