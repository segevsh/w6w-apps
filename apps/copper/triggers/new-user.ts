import type { TriggerDefinition } from "@w6w/types";
import { pollNewUsers } from "../lib/polls.ts";

/**
 * The users of an account are a small bounded collection with no timestamps
 * (https://developer.copper.com/account-and-users/list-users.html, 2026-11-10): every check reads
 * the pages through `list-users` (200 per page, up to 5000 users) and diffs the ids
 * (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-user",
  title: "New User",
  description: "The run gets each user (team member) that is added to the Copper account.",
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: { id: 137658, name: "John Doe", email: "john.doe@example.test" },
  minIntervalMs: 900_000,
  poll({ state }, ctx) {
    return pollNewUsers(state, ctx);
  },
};

export default trigger;
