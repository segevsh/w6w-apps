import ticketNoteCreate from "../../actions/ticket-note-create.ts";
import { writeTests } from "../_write_cases.ts";

writeTests(ticketNoteCreate, {
  name: "ticket-note-create",
  method: "POST",
  path: "/Tickets/9/Notes",
  input: { ticketID: 9, description: "hi", noteType: 1, publish: 1 },
  body: { ticketID: 9, description: "hi", noteType: 1, publish: 1 },
  required: ["ticketID", "description", "noteType", "publish"],
});
