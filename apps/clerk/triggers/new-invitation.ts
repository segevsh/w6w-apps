import { clerkNewest } from "../lib/triggers.ts";
import invitationList from "../actions/invitation-list.ts";

export default clerkNewest({
  key: "new-invitation",
  title: "New Invitation",
  description:
    "The run gets each newly created application invitation (the accept link is not included).",
  action: invitationList,
  input: () => ({ orderBy: "-created_at" }),
  output: [
    { key: "id", type: "string", label: "Invitation ID" },
    { key: "email_address", type: "string", label: "Email address" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "number", label: "Created at (Unix ms)" },
  ],
  sample: {
    id: "inv_2abc123",
    email_address: "ada@example.com",
    status: "pending",
    created_at: 1794128400000,
  },
});
