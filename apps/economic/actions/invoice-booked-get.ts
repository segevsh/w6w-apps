import { getAction } from "../lib/factory.ts";

export default getAction({
  key: "invoice-booked-get",
  resource: "invoice",
  title: "Get Booked Invoice",
  description: "Fetch one booked invoice, including its lines and remainder.",
  path: "/invoices/booked",
  idKey: "bookedInvoiceNumber",
  idLabel: "Booked invoice number",
  idType: "number",
  outputKey: "invoice",
});
