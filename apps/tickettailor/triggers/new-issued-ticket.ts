import { pollFromListAction } from "../../_shared/poll/mod.ts";
import issuedTicketList from "../actions/issued-ticket-list.ts";

export default pollFromListAction({
  key: "new-issued-ticket",
  title: "New Issued Ticket",
  description: "Poll issued tickets through the existing issued-ticket-list action.",
  action: issuedTicketList,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Issued ticket ID" }],
  sample: { id: "sample-ticket" },
  maxPages: 1,
});
