import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import userList from "../actions/user-list.ts";

/**
 * Wraps `user-list` (GET /v1/users/): the organization's user directory, returned whole as a bare
 * array with no parameters, so it is polled as a snapshot and only additions are emitted
 * (https://dev.avoma.com/openapi.yml, verified 2026-11-10).
 */
const trigger: TriggerDefinition = {
  key: "new-user",
  title: "New User",
  description: "The run gets each user newly added to the Avoma organization.",
  output: [
    { key: "change", type: "string", label: "Change (added)" },
    { key: "key", type: "string", label: "User UUID" },
    { key: "values", type: "object", label: "User (uuid, user, role, teams, status)" },
  ],
  sample: {
    change: "added",
    key: "0b6c1a4e-0000-4000-8000-000000000002",
    values: {
      uuid: "0b6c1a4e-0000-4000-8000-000000000002",
      user: { email: "rep@example.com" },
      status: "active",
    },
  },
  minIntervalMs: 900_000,
  async poll({ state }, ctx) {
    const page = await userList.execute({}, ctx) as { results?: unknown[] };
    return await pollSnapshot({
      state,
      maxRows: 5000,
      emit: { added: true },
      rows: (page.results ?? []).map((row) => ({
        key: String((row as { uuid?: unknown }).uuid ?? ""),
        values: row,
      })),
    });
  },
};

export default trigger;
