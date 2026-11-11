import type { TriggerDefinition } from "@w6w/types";
import memberList from "../actions/member-list.ts";
import { ORG_PARAM } from "../lib/params.ts";
import { newRecords } from "../lib/triggers.ts";

/**
 * `GET /api/0/organizations/{org}/members/` is a cursor-paged list with no sort or date filter; it includes approved pending invites (https://docs.sentry.io/api/organizations/list-an-organizations-members/, verified 2026-11-10). An organization's members are a bounded collection.
 * Every check reads the whole list through `member-list` (`returnAll`) and diffs the ids
 * (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-member",
  title: "New Member",
  description:
    "The run gets each member (or approved invite) newly added to a Sentry organization.",
  params: [ORG_PARAM],
  output: [
    { key: "id", type: "string", label: "Member ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "name", type: "string", label: "Name" },
    { key: "orgRole", type: "string", label: "Role" },
    { key: "pending", type: "boolean", label: "Invite pending" },
  ],
  sample: {
    id: "57377908164",
    email: "jane@example.com",
    name: "Jane Doe",
    orgRole: "member",
    pending: false,
  },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const p = (params ?? {}) as Record<string, unknown>;
    const items = await memberList.execute({
      organizationSlug: p.organizationSlug,
      returnAll: true,
    }, ctx);
    return newRecords({
      state,
      items: Array.isArray(items) ? items : [],
      idOf: (item) => (item as { id?: unknown }).id,
    });
  },
};

export default trigger;
