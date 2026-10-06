import opportunityUpdate from "../../actions/opportunity-update.ts";
import { writeTests } from "../_write_cases.ts";

writeTests(opportunityUpdate, {
  name: "opportunity-update",
  method: "PATCH",
  path: "/Opportunities",
  input: { id: 12, probability: 60 },
  body: { id: 12, probability: 60 },
  required: ["id"],
});
