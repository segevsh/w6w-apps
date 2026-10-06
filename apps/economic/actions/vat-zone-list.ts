import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "vat-zone-list",
  resource: "vat-zone",
  title: "List VAT Zones",
  description: "List VAT zones; one is required on customers and invoice recipients.",
  path: "/vat-zones",
});
