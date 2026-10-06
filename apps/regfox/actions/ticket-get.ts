import { getAction } from "../lib/factory.ts";

/** `GET /v2/public/search/tickets/{id}?product=` */
export default getAction({
  key: "ticket-get",
  segment: "tickets",
  noun: "ticket",
  idKey: "ticketId",
  idLabel: "Ticket ID",
});
