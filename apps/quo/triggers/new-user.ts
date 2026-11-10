import type { TriggerDefinition } from "@w6w/types";
import userList from "../actions/user-list.ts";
import { newRecords, readAllPages } from "../lib/triggers.ts";

/**
 * `GET /v1/users` lists the workspace's members (a small bounded collection, paged 50 at a time, its documented maximum;
 * it takes no sort or date filter). Every check reads it through `user-list` and diffs the ids.
 * https://www.quo.com/docs/mdx/api-reference/users/list-users (verified 2026-11-10)
 */
const trigger: TriggerDefinition = {
  key: "new-user",
  title: "New User",
  description: "The run gets each user newly added to your Quo workspace.",
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "role", type: "string", label: "Role" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "US123abc",
    email: "jane@example.com",
    firstName: "Jane",
    lastName: "Doe",
    role: "member",
    createdAt: "2026-11-10T09:00:00Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return newRecords({
      state,
      items: await readAllPages(userList, ctx, 50),
      idOf: (u) => (u as { id?: unknown }).id,
    });
  },
};

export default trigger;
