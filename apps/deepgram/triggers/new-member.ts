import { snapshotFeed } from "../lib/triggers.ts";
import memberList from "../actions/member-list.ts";

type Item = Record<string, unknown>;

/** `GET /v1/projects/{project_id}/members` — everyone with access to the project, unpaginated. */
export default snapshotFeed({
  key: "new-member",
  title: "New Member",
  description: "The run gets each person newly added to the connected Deepgram project.",
  action: memberList,
  items: (result) => (result as { members?: Item[] }).members ?? [],
  idOf: (item) => String(item.member_id ?? ""),
  output: [
    { key: "member_id", type: "string", label: "Member ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "scopes", type: "array", label: "Scopes" },
  ],
  sample: {
    member_id: "member-sample-1",
    email: "dev@example.com",
    first_name: "Sample",
    last_name: "Person",
    scopes: ["member"],
  },
});
