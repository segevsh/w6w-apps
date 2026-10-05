import type { ActionDefinition } from "@w6w/types";
import { BitwardenClient } from "../lib/client.ts";
import { items, shapeMember } from "../lib/shape.ts";

const action: ActionDefinition = {
  key: "member-list",
  type: "read",
  resource: "member",
  title: "List members",
  description:
    "Every member of the organization with role, status and collection access. Includes invited, revoked and staged members \u2014 check `statusName`. No pagination parameter is documented.",
  params: [],
  output: [
    { key: "members", type: "array", label: "Members, with typeName/statusName added" },
    { key: "count", type: "number", label: "How many" },
    { key: "byStatus", type: "object", label: "Counts per statusName" },
  ],

  async execute(input, ctx) {
    void input;
    const raw = items(await new BitwardenClient(ctx).request("/members"));
    const members = raw.map((m) => shapeMember(m));
    const byStatus: Record<string, number> = {};
    for (const m of members) {
      const k = String(m.statusName ?? m.status);
      byStatus[k] = (byStatus[k] ?? 0) + 1;
    }
    return { members, count: members.length, byStatus };
  },
};

export default action;
