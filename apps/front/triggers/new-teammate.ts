import action from "../actions/teammate-list.ts";
import { bounded } from "../lib/triggers.ts";

/** `GET /teammates` — the company's teammates, one request (https://dev.frontapp.com/reference/list-teammates, verified 2026-11-10). */
export default bounded({
  key: "new-teammate",
  title: "New Teammate",
  description:
    "The run gets each teammate newly added to the Front company (checked on a schedule).",
  action,
  output: [
    { key: "id", type: "string", label: "Teammate ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "username", type: "string", label: "Username" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "is_admin", type: "boolean", label: "Admin" },
  ],
  sample: {
    id: "tea_9z8y",
    email: "grace@example.test",
    username: "grace",
    first_name: "Grace",
    last_name: "Hopper",
    is_admin: false,
  },
});
