import { eventFilter, listAction } from "../lib/rows.ts";

export default listAction({
  key: "tickets-list",
  title: "List ticket holders",
  resource: "tickets",
  whereType: "TicketWhereInput",
  fields:
    "id code fullPrice commission diceCommission total claimedAt holder { id firstName lastName email optInPartners } ticketType { id name }",
  filters: [eventFilter],
});
