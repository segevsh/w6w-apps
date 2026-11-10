import { snapshotTrigger } from "../lib/triggers.ts";
import usersList from "../actions/users-list.ts";

export default snapshotTrigger({
  key: "new-user",
  title: "New User",
  description:
    "The run gets each user newly added to the Dialpad company (active users, as the List Users action defaults).",
  action: usersList,
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "display_name", type: "string", label: "Display name" },
    { key: "emails", type: "array", label: "Email addresses" },
    { key: "state", type: "string", label: "User state" },
    { key: "office_id", type: "string", label: "Office ID" },
  ],
  sample: {
    id: "6001",
    display_name: "Ada Lovelace",
    emails: ["ada@example.com"],
    state: "active",
    office_id: "5001",
  },
});
