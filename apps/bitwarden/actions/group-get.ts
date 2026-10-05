import type { ActionDefinition } from "@w6w/types";
import { assertUuid, BitwardenClient } from "../lib/client.ts";
import { shapeGroup } from "../lib/shape.ts";

const action: ActionDefinition = {
  key: "group-get",
  type: "read",
  resource: "group",
  title: "Get a group",
  description:
    "Retrieve one group with its collection assignments. Member ids are a separate call (`group-member-ids-get`).",
  params: [
    {
      key: "groupId",
      label: "Group ID",
      type: "string",
      required: true,
      default: "",
      hint: "From `group-list`.",
    },
  ],
  output: [
    { key: "group", type: "object", label: "The group as returned" },
    { key: "id", type: "string", label: "Group id" },
    { key: "name", type: "string", label: "Name" },
    { key: "externalId", type: "string", label: "External id" },
    { key: "collections", type: "array", label: "Collections with permissions" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = assertUuid(p.groupId, "groupId");
    return shapeGroup(await new BitwardenClient(ctx).request(`/groups/${id}`));
  },
};

export default action;
