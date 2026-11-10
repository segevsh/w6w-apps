import groupMemberList from "../actions/group-member-list.ts";
import { sinceTrigger, stampMs } from "../lib/triggers.ts";

/**
 * `GET /groups/{group_id}/members?from=<since>&date_field=created_at` — `from` and `date_field`
 * (created_at | updated_at, default created_at) are documented, no sort order; the member record
 * carries `joined_on` ("when the member joined the group"), which is the stamp the seed floor
 * compares (https://uscreen.io/api/publisher.yml, verified 2026-11-10).
 */
export default sinceTrigger({
  key: "new-group-member",
  title: "New Group Member",
  description: "The run gets each member newly added to the chosen group.",
  params: [{
    key: "groupId",
    label: "Group ID",
    type: "number",
    required: true,
    validation: { integer: true },
  }],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "name", type: "string", label: "Name" },
    { key: "role", type: "string", label: "Role" },
    { key: "joined_on", type: "number", label: "Joined on (unix seconds)" },
  ],
  sample: {
    id: 501,
    email: "member@example.test",
    name: "Sample Member",
    role: "member",
    joined_on: 1794182400,
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  createdMs: (item) => stampMs((item as { joined_on?: unknown }).joined_on),
  async fetchPage(since, page, ctx, params) {
    const out = await groupMemberList.execute(
      { groupId: Number(params.groupId), from: since, dateField: "created_at", page },
      ctx,
    ) as { items?: unknown[]; hasMore?: boolean; nextPage?: number | null };
    return {
      items: out.items ?? [],
      next: out.hasMore && typeof out.nextPage === "number" ? out.nextPage : undefined,
    };
  },
});
