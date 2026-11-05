import { dateFilter, eventFilter, listAction } from "../lib/rows.ts";

export default listAction({
  key: "ticket-transfers-list",
  title: "List ticket transfers",
  resource: "ticketTransfers",
  whereType: "TicketTransferWhereInput",
  fields: "id transferredAt tickets { id } orders { id }",
  filters: [
    eventFilter,
    dateFilter("transferredAfter", "transferredAt", "Transferred on or after"),
  ],
});
