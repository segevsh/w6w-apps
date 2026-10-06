import { writeAction } from "../lib/factory.ts";

/**
 * `POST /Opportunities` — create a sales opportunity.
 *
 * The vendor's Opportunities page marks `title`, `companyID`, `ownerResourceID`, `stage`,
 * `status`, `projectedCloseDate`, `amount`, `cost`, `probability` and `useQuoteTotals` required;
 * the last four are optional params here so the API's own message names a missing one.
 * The category's own "required" and picklist settings are NOT enforced through the API, so a
 * record can be created that the UI would refuse.
 */
export default writeAction({
  key: "opportunity-create",
  title: "Create opportunity",
  description: "Create a sales opportunity. `stage` and `status` are picklist ids; amount, cost, " +
    "probability and the quote-totals flag are required by the vendor's entity page.",
  resource: "opportunity",
  method: "POST",
  path: "/Opportunities",
  fields: [
    { key: "title", label: "Title", type: "string", required: true },
    { key: "companyID", label: "Company ID", type: "number", required: true },
    { key: "ownerResourceID", label: "Owner resource ID", type: "number", required: true },
    { key: "stage", label: "Stage (picklist id)", type: "number", required: true },
    { key: "status", label: "Status (picklist id)", type: "number", required: true },
    { key: "projectedCloseDate", label: "Projected close date", type: "datetime", required: true },
    { key: "amount", label: "Amount", type: "number" },
    { key: "cost", label: "Cost", type: "number" },
    { key: "probability", label: "Probability (0-100)", type: "number" },
    { key: "useQuoteTotals", label: "Use quote totals", type: "boolean" },
    { key: "contactID", label: "Contact ID", type: "number" },
    { key: "description", label: "Description", type: "text" },
    { key: "leadSource", label: "Lead source (picklist id)", type: "number" },
  ],
});
