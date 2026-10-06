import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "invoice-booked-list",
  resource: "invoice",
  title: "List Booked Invoices",
  description: "List booked invoices; filter by date, customer or remainder.",
  path: "/invoices/booked",
});
