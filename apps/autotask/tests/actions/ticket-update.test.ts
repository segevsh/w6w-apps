import ticketUpdate from "../../actions/ticket-update.ts";
import { writeTests } from "../_write_cases.ts";

writeTests(ticketUpdate, {
  name: "ticket-update",
  method: "PATCH",
  path: "/Tickets",
  input: { id: 9, status: 5, resolution: "done" },
  body: { id: 9, status: 5, resolution: "done" },
  required: ["id"],
});
