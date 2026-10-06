import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, seg } from "../lib/client.ts";
import { groupIdParam, selectParam } from "../lib/params.ts";

interface Input {
  groupId: string;
  select?: string[];
}

/**
 * `GET /groups/{id}`
 *
 * https://learn.microsoft.com/en-us/graph/api/group-get?view=graph-rest-1.0
 *
 * Returns the default property set unless `$select` names more. Relationships (members, owners)
 * are not part of the group object: use List Group Members / List Group Owners.
 */
const getGroup: ActionDefinition<Input, Record<string, unknown>> = {
  key: "get-group",
  type: "read",
  resource: "group",
  title: "Get Group",
  description: "Get one group by object id.",
  params: [groupIdParam, selectParam()],
  output: [
    { key: "id", type: "string", label: "Object id" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "description", type: "string", label: "Description" },
    { key: "groupTypes", type: "array", label: "Group types" },
    { key: "mailEnabled", type: "boolean", label: "Mail enabled" },
    { key: "securityEnabled", type: "boolean", label: "Security enabled" },
  ],

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    return await client.request(`/groups/${seg(input.groupId)}`, {
      query: { $select: odataList(input.select) },
    });
  },
};

export default getGroup;
