import { pollFromListAction } from "../../_shared/poll/mod.ts";
import ticketList from "../actions/ticket-list.ts";

export default pollFromListAction({
  key: "new-ticket",
  title: "New Ticket",
  description: "Poll tickets through the existing ticket-list action.",
  action: ticketList,
  input: () => ({}),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Ticket ID" }],
  sample: { id: 101, subject: "Support request" },
  maxPages: 1,
});
