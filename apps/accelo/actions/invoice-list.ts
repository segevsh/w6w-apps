import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "invoice-list",
  resource: "invoice",
  path: "/invoices",
  title: "List Invoices",
  description: "List invoices.",
});
