import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import action from "../actions/user-list.ts";

// Bounded collection (brief §9.1 c): Tailscale's API reference states "The Tailscale API does not
// currently support pagination. All results are returned at once." and `GET
// /tailnet/{tailnet}/users` "List all users of a tailnet" (https://tailscale.com/api, verified
// 2026-11-09), so one request is the whole member list. Above 5000 users the kit throws.
const trigger: TriggerDefinition = {
  key: "new-user",
  title: "New User",
  description:
    "The run gets each user who newly appears in the tailnet's user list (members by default).",
  params: action.params,
  output: [
    { key: "change", type: "string", label: "Change (always added)" },
    { key: "key", type: "string", label: "User ID" },
    { key: "values", type: "object", label: "The user as Tailscale returns it" },
  ],
  sample: {
    change: "added",
    key: "u101",
    values: {
      id: "u101",
      displayName: "Ada",
      loginName: "ada@example.com",
      role: "member",
      status: "active",
    },
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const result = await action.execute(params, ctx) as { users?: unknown[] };
    return await pollSnapshot({
      state,
      maxRows: 5000,
      emit: { added: true, updated: false },
      rows: (result.users ?? []).map((user) => ({
        key: String((user as { id?: unknown }).id ?? ""),
        values: user,
      })),
    });
  },
};

export default trigger;
