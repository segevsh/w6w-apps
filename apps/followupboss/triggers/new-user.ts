import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import listUsers from "../actions/list-users.ts";
import { idOf, records } from "../lib/triggers.ts";

// GET /users has a `sort` argument (id, name, created) but its default is the documented reverse
// `id` order ("Resources are returned in reverse order by id by default"):
// https://docs.followupboss.com/reference/pagination (verified 2026-11-10).
export default pollFromListAction<Record<string, unknown>>({
  key: "new-user",
  title: "New User",
  description: "The run gets each newly added user (agent, broker or lender) in Follow Up Boss.",
  action: listUsers as unknown as ActionDefinition,
  input: () => ({ limit: 100 }),
  items: records,
  idOf,
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "role", type: "string", label: "Role" },
    { key: "created", type: "string", label: "Created" },
  ],
  sample: {
    id: 4,
    name: "Sam Agent",
    email: "agent@example.com",
    role: "Agent",
    created: "2026-11-09T10:00:00Z",
  },
  maxPages: 1,
});
