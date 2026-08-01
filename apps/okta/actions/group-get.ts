import type { ActionDefinition } from "@w6w/types";
import { OktaClient } from "../lib/client.ts";

const groupGet: ActionDefinition<{ groupId: string }> = {
  key: "group-get",
  type: "read",
  resource: "group",
  title: "Get Group",
  description: "Fetch a group by id.",
  params: [
    {
      key: "groupId",
      label: "Group ID",
      type: "string",
      required: true,
      placeholder: "00g1emaKYZTWRYYRRTSK",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "profile.name", type: "string", label: "Name" },
    { key: "profile.description", type: "string", label: "Description" },
    { key: "type", type: "string", label: "Type" },
  ],

  execute(input, ctx) {
    return new OktaClient(ctx).request(`/groups/${encodeURIComponent(input.groupId)}`);
  },
};

export default groupGet;
