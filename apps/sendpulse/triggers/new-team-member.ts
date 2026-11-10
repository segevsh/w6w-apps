import usersList from "../actions/users-list.ts";
import { dataOf, snapshotTrigger } from "../lib/snapshot.ts";

/**
 * Snapshot poll (brief 9.1 c). `GET /crm/v1/users` is unpaged: it returns the account's confirmed team
 * members in one request (https://api.sendpulse.com/.well-known/openapi/crm.yaml, `/users`); a
 * member appears once the invitation is confirmed.
 */
export default snapshotTrigger({
  key: "new-team-member",
  title: "New Team Member",
  description: "The run gets each team member who newly joins the SendPulse account.",
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: { id: 9001, firstname: "Ada", lastname: "Lovelace", email: "ada@example.com" },
  rows: async (_p, ctx) => dataOf(await usersList.execute({}, ctx)),
  idOf: (r) => String(r.id),
});
