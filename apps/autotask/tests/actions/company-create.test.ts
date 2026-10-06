import companyCreate from "../../actions/company-create.ts";
import { writeTests } from "../_write_cases.ts";

writeTests(companyCreate, {
  name: "company-create",
  method: "POST",
  path: "/Companies",
  input: {
    companyName: "Acme",
    companyType: 1,
    ownerResourceID: 3,
    phone: "555",
    isActive: true,
  },
  body: { companyName: "Acme", companyType: 1, ownerResourceID: 3, phone: "555", isActive: true },
  required: ["companyName", "companyType", "ownerResourceID", "phone"],
});
