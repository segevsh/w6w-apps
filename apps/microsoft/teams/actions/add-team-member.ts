import type { ActionDefinition } from "@w6w/types";
import { API_URL, GraphClient, seg, teamsError } from "../lib/client.ts";
import { teamIdParam } from "../lib/params.ts";

interface Input {
  teamId: string;
  user: string;
  role?: string;
}

/**
 * `POST /teams/{team-id}/members`
 *
 * https://learn.microsoft.com/en-us/graph/api/team-post-members?view=graph-rest-1.0
 *
 * Adds an `aadUserConversationMember` to a team. Answers `201 Created` with the
 * new membership.
 *
 * The request body is the one genuinely awkward shape in this App: the target
 * user is named by an OData *navigation binding*, not by a plain id —
 *
 * ```json
 * {
 *   "@odata.type": "#microsoft.graph.aadUserConversationMember",
 *   "roles": ["owner"],
 *   "user@odata.bind": "https://graph.microsoft.com/v1.0/users('8b081ef6-…')"
 * }
 * ```
 *
 * so the action takes an id or UPN and builds that URL. Both forms are
 * documented, with one carve-out repeated in the hint: **a UPN cannot be used
 * to add a guest.**
 *
 * Permissions: least-privileged is `TeamMember.ReadWriteNonOwnerRole.All`, which
 * — as its name says — cannot grant `owner`. This App requests
 * `TeamMember.ReadWrite.All` so the Role field is not a lie.
 *
 * `idempotent: false`. Graph offers no client-supplied dedupe key here, and a
 * repeat call on an existing member is an error rather than a no-op. Note also
 * the documented `404 Not Found` when the target user is disabled or blocked —
 * a status that reads like "no such team" but is not.
 */
const addTeamMember: ActionDefinition<Input, Record<string, unknown>> = {
  key: "add-team-member",
  type: "perform",
  resource: "team-member",
  title: "Add Team Member",
  description: "Add a user to a team, as a member or as an owner.",
  idempotent: false,
  params: [
    teamIdParam,
    {
      key: "user",
      label: "User",
      type: "string",
      required: true,
      placeholder: "8b081ef6-4792-4def-b2c9-c363a1bf41d5",
      hint:
        "Entra object id or user principal name (`jacob@contoso.com`). A UPN cannot be used to add a guest user — use the object id for guests.",
    },
    {
      key: "role",
      label: "Role",
      type: "select",
      default: "member",
      options: [
        { value: "member", label: "Member" },
        { value: "owner", label: "Owner" },
      ],
      hint:
        "`Member` sends an empty `roles` array, which is what Graph documents for a basic member. `Owner` needs the `TeamMember.ReadWrite.All` scope. The `guest` role is derived from the account, not set here.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Membership id (opaque)" },
    { key: "userId", type: "string", label: "Entra user id" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "email", type: "string", label: "Email" },
    { key: "roles", type: "array", label: "Roles" },
  ],

  async execute(input, ctx): Promise<Record<string, unknown>> {
    const user = (input.user ?? "").trim();
    if (!user) throw new Error(teamsError("User is required (Entra object id or UPN)."));

    const client = new GraphClient(ctx);
    ctx.log("info", "adding team member", { teamId: input.teamId, role: input.role ?? "member" });

    return await client.request(`/teams/${seg(input.teamId)}/members`, {
      method: "POST",
      body: {
        "@odata.type": "#microsoft.graph.aadUserConversationMember",
        roles: input.role === "owner" ? ["owner"] : [],
        // The single-quoted key form is what the reference uses, and it accepts
        // either a GUID or a UPN inside the quotes.
        "user@odata.bind": `${API_URL}/users('${user.replaceAll("'", "''")}')`,
      },
    });
  },
};

export default addTeamMember;
