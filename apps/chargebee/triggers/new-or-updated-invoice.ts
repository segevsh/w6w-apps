import type { ActionDefinition } from "@w6w/types";
import { chargebeeTrigger } from "../lib/triggers.ts";
import listInvoices from "../actions/list-invoices.ts";

export default chargebeeTrigger({
  key: "new-or-updated-invoice",
  title: "New or Updated Invoice",
  description: "The run gets each invoice when it is created and each time it is updated.",
  action: listInvoices as ActionDefinition,
  wrapper: "invoice",
  sortAttribute: "updated_at",
  stamp: "updated_at",
  output: [
    { key: "id", type: "string", label: "Invoice ID" },
    { key: "customer_id", type: "string", label: "Customer ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "total", type: "number", label: "Total (minor units)" },
    { key: "date", type: "number", label: "Invoice date (Unix seconds)" },
    { key: "updated_at", type: "number", label: "Updated at (Unix seconds)" },
  ],
  sample: {
    id: "inv_1",
    customer_id: "cust_1",
    status: "paid",
    total: 1000,
    date: 1762689600,
    updated_at: 1762689600,
  },
});
