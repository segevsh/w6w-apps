import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listContactLists from "../actions/list-contact-lists.ts";

export default pollFromListAction({
  key: "new-contact-list",
  title: "New Contact List",
  description: "The run gets each newly created contact list.",
  action: listContactLists,
  input: () => ({ limit: 500 }),
  items: (result) => (result as { lists?: unknown[] }).lists ?? [],
  idOf: (item) =>
    String(
      (item as { list_id?: unknown; id?: unknown }).list_id ?? (item as { id?: unknown }).id ?? "",
    ),
  output: [{ key: "list_id", type: "string", label: "Contact list ID" }],
  sample: { list_id: "list-1" },
  maxPages: 1,
});
