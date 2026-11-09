import { pollFromListAction } from "../../_shared/poll/mod.ts";
import emailList from "../actions/email-list.ts";

export default pollFromListAction({
  key: "new-email",
  title: "New Email",
  description: "Fires when a new email appears in the Instantly Unibox.",
  action: emailList,
  input: () => ({ sort_order: "desc", limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [{ key: "id", type: "string", label: "Email ID" }],
  sample: { id: "email_123" },
});
