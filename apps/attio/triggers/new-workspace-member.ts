import type { TriggerDefinition } from "@w6w/types";
import listWorkspaceMembers from "../actions/list-workspace-members.ts";
import { newRecords } from "../lib/triggers.ts";

/**
 * `GET /v2/workspace_members` lists the seats of the workspace — a small bounded collection
 * (https://docs.attio.com/rest-api/endpoint-reference/workspace-members/list-workspace-members,
 * 2026-11-10). Every check reads it through `list-workspace-members` and diffs the ids
 * (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-workspace-member",
  title: "New Workspace Member",
  description: "The run gets each person who newly gets a seat in the Attio workspace.",
  output: [
    { key: "id", type: "object", label: "Member ID ({ workspace_id, workspace_member_id })" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email_address", type: "string", label: "Email address" },
    { key: "access_level", type: "string", label: "Access level" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: { workspace_id: "w_1", workspace_member_id: "m_1" },
    first_name: "Ada",
    last_name: "Lovelace",
    email_address: "ada@example.com",
    access_level: "admin",
    created_at: "2026-11-09T10:00:00.000000000Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const res = await listWorkspaceMembers.execute({}, ctx) as { records?: unknown[] };
    return newRecords({
      state,
      items: res.records ?? [],
      idOf: (m) => (m as { id?: { workspace_member_id?: unknown } }).id?.workspace_member_id,
    });
  },
};

export default trigger;
