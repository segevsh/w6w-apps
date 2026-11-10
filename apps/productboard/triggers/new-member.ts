import type { ActionDefinition } from "@w6w/types";
import memberList from "../actions/member-list.ts";
import { listPages, snapshotTrigger } from "../lib/triggers.ts";

// `GET /v2/members` is the workspace's seat list: a small bounded collection, so each check
// snapshots every page and emits ids that were not there before (brief 9.1c). Rows have no
// timestamps, so there is no updated sibling. Like the action's default, disabled and
// invitation-pending members are not in the list. Emails read `[redacted]` without the
// `members:pii:read` scope. `member-search` returns the same records.
export default snapshotTrigger<Record<string, never>>({
  key: "new-member",
  title: "New Member",
  description: "The run gets each member newly added to the workspace.",
  load: listPages<Record<string, never>>(memberList as unknown as ActionDefinition, () => ({})),
  rowKey: (m) => String(m.id ?? ""),
  output: [
    { key: "id", type: "string", label: "Member ID" },
    { key: "fields", type: "object", label: "Fields (name, email, role)" },
  ],
  sample: {
    id: "member-1",
    type: "member",
    fields: { name: "Jane Doe", email: "jane@example.com", role: "maker" },
  },
});
