import { getAction } from "../lib/factory.ts";

export default getAction({
  key: "invoice-draft-get",
  resource: "invoice",
  title: "Get Draft Invoice",
  description: "Fetch one draft invoice, including its lines.",
  path: "/invoices/drafts",
  idKey: "draftInvoiceNumber",
  idLabel: "Draft invoice number",
  idType: "number",
  outputKey: "invoice",
});
