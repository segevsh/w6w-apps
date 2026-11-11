import ticketList from "../actions/ticket-list.ts";
import { listTrigger } from "../lib/list-trigger.ts";
export default listTrigger({
  key: "new-ticket",
  title: "New Ticket",
  action: ticketList,
  output: [{ key: "id", type: "number", label: "Ticket ID" }],
  sample: { id: 1, regDate: "2026-11-10T00:00:00Z" },
});
