import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "invoice-get",
  resource: "invoice",
  path: "/invoices",
  idKey: "invoiceId",
  idLabel: "Invoice ID",
  title: "Get Invoice",
  description: "Fetch one invoice by id.",
});
