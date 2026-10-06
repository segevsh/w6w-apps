import companyUpdate from "../../actions/company-update.ts";
import { writeTests } from "../_write_cases.ts";

writeTests(companyUpdate, {
  name: "company-update",
  method: "PATCH",
  path: "/Companies",
  input: { id: 4, city: "Austin", isActive: false },
  body: { id: 4, city: "Austin", isActive: false },
  required: ["id"],
});
