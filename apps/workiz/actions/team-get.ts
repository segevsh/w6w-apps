import type { ActionDefinition } from "@w6w/types";
import { encodeId, WorkizClient } from "../lib/client.ts";
import type { TeamMember } from "../lib/schema.ts";

/**
 * `GET /team/get/{USER_ID}` — one team member by id.
 *
 * `USER_ID` is the `id` a member carries in `GET /team/all/`. The response is
 * a single object (not the array `team-list` returns), and calling it with an
 * id that does not exist yields an empty answer rather than an error, so the
 * output is nullable.
 */
interface Input {
  userId: string;
}

const teamGet: ActionDefinition<Input, TeamMember | null> = {
  key: "team-get",
  type: "read",
  resource: "team",
  title: "Get Team Member",
  description: "Read one Workiz team member by id.",
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      hint: "The member's id, as returned by List Team.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Team member id" },
    { key: "name", type: "string", label: "Name" },
    { key: "role", type: "string", label: "Role" },
    { key: "email", type: "string", label: "Email" },
    { key: "active", type: "boolean", label: "Active" },
    { key: "fieldTech", type: "boolean", label: "Field technician" },
    { key: "created", type: "string", label: "Created" },
    { key: "serviceAreas", type: "array", label: "Service areas" },
    { key: "skills", type: "array", label: "Skills" },
  ],

  execute(input, ctx) {
    return new WorkizClient(ctx).json<TeamMember>(`/team/get/${encodeId(input.userId)}`);
  },
};

export default teamGet;
