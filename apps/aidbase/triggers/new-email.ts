import type { ActionDefinition } from "@w6w/types";
import emailList from "../actions/email-list.ts";
import { pickParams, windowTrigger } from "../lib/triggers.ts";

const action = emailList as unknown as ActionDefinition;

export default windowTrigger({
  key: "new-email",
  title: "New Email",
  description:
    "The run gets each email received in an inbox, polled through email-list with the documented created_after filter.",
  action,
  params: pickParams(action, ["emailInboxId", "status"]),
  output: [
    { key: "id", type: "string", label: "Email ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "from_email", type: "string", label: "From" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "g7e1f0c8-3h75-6g5e-0f7h-1c9d0e8f7g6h",
    subject: "Question about pricing",
    from_email: "customer@example.com",
    status: "open",
    created_at: "2026-11-09T11:15:00.000Z",
    updated_at: "2026-11-09T11:15:00.000Z",
  },
});
