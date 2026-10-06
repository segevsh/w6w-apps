import contactCreate from "../../actions/contact-create.ts";
import { writeTests } from "../_write_cases.ts";

writeTests(contactCreate, {
  name: "contact-create",
  method: "POST",
  path: "/Companies/4/Contacts",
  input: { companyID: 4, firstName: "A", lastName: "B", isActive: 1 },
  body: { companyID: 4, firstName: "A", lastName: "B", isActive: 1 },
  required: ["companyID", "firstName", "lastName", "isActive"],
});
