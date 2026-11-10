import { snapshotFeed } from "../lib/triggers.ts";
import inviteList from "../actions/invite-list.ts";

type Item = Record<string, unknown>;

/**
 * `GET /v1/projects/{project_id}/invites` — outstanding invitations, unpaginated and keyed by the
 * invitee's email (the only identifier Deepgram returns for an invite).
 */
export default snapshotFeed({
  key: "new-invite",
  title: "New Invitation",
  description: "The run gets each invitation newly sent for the connected Deepgram project.",
  action: inviteList,
  items: (result) => (result as { invites?: Item[] }).invites ?? [],
  idOf: (item) => String(item.email ?? "").toLowerCase(),
  output: [
    { key: "email", type: "string", label: "Invitee email" },
    { key: "scope", type: "string", label: "Scope offered" },
  ],
  sample: { email: "new.hire@example.com", scope: "member" },
});
