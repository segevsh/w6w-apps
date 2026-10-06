import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "invoice-draft-list",
  resource: "invoice",
  title: "List Draft Invoices",
  description: "List draft (not yet booked) invoices.",
  path: "/invoices/drafts",
});
