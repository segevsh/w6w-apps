import type { ActionDefinition } from "@w6w/types";
import { GoogleMeetClient } from "../lib/client.ts";

interface Input {
  name: string;
}

/**
 * `meet.spaces.members.get` — GET `v2/{+name}`
 * (https://meet.googleapis.com/$discovery/rest?version=v2).
 */
const getSpaceMember: ActionDefinition<Input> = {
  key: "get-space-member",
  type: "read",
  resource: "member",
  title: "Get Space Member",
  description: "Retrieve a single space member by resource name.",
  params: [
    {
      key: "name",
      label: "Member name",
      type: "string",
      required: true,
      hint: "`spaces/{space}/members/{member}`.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Member name" },
    { key: "email", type: "string", label: "Email" },
    { key: "role", type: "string", label: "Role (COHOST)" },
  ],

  execute(input, ctx) {
    const client = new GoogleMeetClient(ctx);
    return client.request(`/${input.name}`);
  },
};

export default getSpaceMember;
