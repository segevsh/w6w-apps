import { writeAction } from "../lib/factory.ts";

/** `PATCH /Opportunities` — change only the fields sent. */
export default writeAction({
  key: "opportunity-update",
  title: "Update opportunity",
  description: "Change the fields you send on an opportunity (PATCH — the rest is left alone).",
  resource: "opportunity",
  method: "PATCH",
  path: "/Opportunities",
  fields: [
    { key: "title", label: "Title", type: "string" },
    { key: "ownerResourceID", label: "Owner resource ID", type: "number" },
    { key: "stage", label: "Stage (picklist id)", type: "number" },
    { key: "status", label: "Status (picklist id)", type: "number" },
    { key: "projectedCloseDate", label: "Projected close date", type: "datetime" },
    { key: "amount", label: "Amount", type: "number" },
    { key: "cost", label: "Cost", type: "number" },
    { key: "probability", label: "Probability (0-100)", type: "number" },
    { key: "useQuoteTotals", label: "Use quote totals", type: "boolean" },
    { key: "contactID", label: "Contact ID", type: "number" },
    { key: "description", label: "Description", type: "text" },
    { key: "leadSource", label: "Lead source (picklist id)", type: "number" },
  ],
});
