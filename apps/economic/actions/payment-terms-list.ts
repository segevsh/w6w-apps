import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "payment-terms-list",
  resource: "payment-terms",
  title: "List Payment Terms",
  description: "List payment terms; one is required on customers and invoices.",
  path: "/payment-terms",
});
