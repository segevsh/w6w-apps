import opportunityCreate from "../../actions/opportunity-create.ts";
import { writeTests } from "../_write_cases.ts";

writeTests(opportunityCreate, {
  name: "opportunity-create",
  method: "POST",
  path: "/Opportunities",
  input: {
    title: "Renewal",
    companyID: 4,
    ownerResourceID: 3,
    stage: 1,
    status: 1,
    projectedCloseDate: "2026-12-01T00:00:00Z",
    amount: 1000,
    useQuoteTotals: false,
  },
  body: {
    title: "Renewal",
    companyID: 4,
    ownerResourceID: 3,
    stage: 1,
    status: 1,
    projectedCloseDate: "2026-12-01T00:00:00Z",
    amount: 1000,
    useQuoteTotals: false,
  },
  required: ["title", "companyID", "ownerResourceID", "stage", "status", "projectedCloseDate"],
});
