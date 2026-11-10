import { clerkNewest } from "../lib/triggers.ts";
import sessionList from "../actions/session-list.ts";

export default clerkNewest({
  key: "new-session",
  title: "New Session",
  description:
    "The run gets each newly started session of the chosen user (the session token is not included).",
  action: sessionList,
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      placeholder: "user_2abc123",
      hint: "The user whose sessions to watch.",
    },
  ],
  input: (p) => ({ userId: p.userId }),
  output: [
    { key: "id", type: "string", label: "Session ID" },
    { key: "user_id", type: "string", label: "User ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "number", label: "Created at (Unix ms)" },
  ],
  sample: {
    id: "sess_2abc123",
    user_id: "user_2abc123",
    status: "active",
    created_at: 1794128400000,
  },
});
