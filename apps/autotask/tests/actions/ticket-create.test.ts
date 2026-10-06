import ticketCreate from "../../actions/ticket-create.ts";
import { writeTests } from "../_write_cases.ts";

writeTests(ticketCreate, {
  name: "ticket-create",
  method: "POST",
  path: "/Tickets",
  input: { companyID: 5, title: "Printer", status: 1, priority: 2, description: "d" },
  body: { companyID: 5, title: "Printer", status: 1, priority: 2, description: "d" },
  required: ["companyID", "title", "status", "priority"],
});
