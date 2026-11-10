import type { TriggerDefinition } from "@w6w/types";
import spaceMemberList from "../actions/space-member-list.ts";
import { newRecords, readAllPages } from "../lib/triggers.ts";

/**
 * GET /space_members takes `space_id`, `status` and paging only (no sort or since filter), so
 * every check reads all pages of the chosen space through `space-member-list` and diffs the
 * membership ids (`pollSnapshot`, added only; more than 5000 members throws, naming the cap).
 * https://api-headless.circle.so/api/admin/v2/swagger.yaml (2026-11-10)
 */
const trigger: TriggerDefinition = {
  key: "new-space-member",
  title: "New Space Member",
  description: "The run gets each member who newly joins the chosen Circle space.",
  params: [
    {
      key: "spaceId",
      label: "Space ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
  ],
  output: [
    { key: "id", type: "number", label: "Membership ID" },
    { key: "space_id", type: "number", label: "Space ID" },
    { key: "community_member_id", type: "number", label: "Member ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Joined at" },
    { key: "community_member", type: "object", label: "Member" },
  ],
  sample: {
    id: 2,
    space_id: 1,
    community_member_id: 2,
    status: "active",
    created_at: "2026-11-09T12:48:42.000Z",
    community_member: { name: "Sample Member", email: "member@example.com" },
  },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const spaceId = Number((params as { spaceId?: unknown }).spaceId);
    if (!Number.isInteger(spaceId)) throw new Error("spaceId must be an integer");
    return newRecords({ state, items: await readAllPages(spaceMemberList, { spaceId }, ctx) });
  },
};

export default trigger;
