import type { ActionDefinition } from "@w6w/types";
import memberList from "../actions/member-list.ts";
import { snapshotTrigger } from "../lib/snapshots.ts";

/** `GET /api/v3/members` answers every member as one array with no paging or order, so each check diffs the ids. */
export default snapshotTrigger({
  key: "new-member",
  title: "New Member",
  description: "The run gets each newly added workspace member.",
  action: memberList as unknown as ActionDefinition,
  input: () => ({}),
  output: [
    { key: "id", type: "string", label: "Member ID" },
    { key: "role", type: "string", label: "Role" },
    { key: "profile", type: "object", label: "Profile (name, mention_name, email_address)" },
  ],
  sample: { id: "mem-1", role: "member", profile: { name: "Sam Dev", mention_name: "sam" } },
});
