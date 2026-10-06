import timeEntryCreate from "../../actions/time-entry-create.ts";
import { writeTests } from "../_write_cases.ts";

writeTests(timeEntryCreate, {
  name: "time-entry-create",
  method: "POST",
  path: "/TimeEntries",
  input: { resourceID: 2, roleID: 3, ticketID: 9, hoursWorked: "1.5", isNonBillable: "true" },
  body: { resourceID: 2, roleID: 3, ticketID: 9, hoursWorked: 1.5, isNonBillable: true },
  required: ["resourceID", "roleID"],
});
