import contactUpdate from "../../actions/contact-update.ts";
import { writeTests } from "../_write_cases.ts";

writeTests(contactUpdate, {
  name: "contact-update",
  method: "PATCH",
  path: "/Companies/4/Contacts",
  input: { id: 8, companyID: 4, emailAddress: "a@b.com" },
  body: { id: 8, companyID: 4, emailAddress: "a@b.com" },
  required: ["id", "companyID"],
});
