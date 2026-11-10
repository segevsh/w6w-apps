import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import membersList from "../actions/members-list.ts";

interface TeamMember {
  id?: unknown;
  isRemoved?: unknown;
  [key: string]: unknown;
}

/**
 * Wraps `members-list` (`GET /teams/members`), which the Admin API documents as returning every
 * team member in one unpaginated response. A team roster is a small bounded collection (the kit
 * refuses more than 5000 rows), so each check compares the whole roster with the last one and
 * emits ids that were not there before. Removed members are left out of the snapshot.
 */
const trigger: TriggerDefinition = {
  key: "new-member",
  title: "New Team Member",
  description: "The run gets each member newly added to the Cursor team.",
  params: [],
  output: [
    { key: "id", type: "string", label: "Member ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "role", type: "string", label: "Role" },
  ],
  sample: { id: "user_1", name: "Alex", email: "alex@example.com", role: "member" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await (membersList as ActionDefinition).execute({}, ctx) as {
      teamMembers?: TeamMember[];
    };
    const members = (result.teamMembers ?? []).filter((m) => m.isRemoved !== true);
    const { events, nextState } = await pollSnapshot({
      state,
      rows: members.map((m) => ({ key: String(m.id ?? ""), values: m })),
      emit: { added: true, updated: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
