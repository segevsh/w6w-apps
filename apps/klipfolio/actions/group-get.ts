import type { ActionDefinition } from "@w6w/types";
import { KlipfolioClient, recordResult, seg } from "../lib/client.ts";

interface Input {
  group_id: string;
  full?: boolean;
  client_id?: string;
}

/** `GET /groups/{group_id}`. */
const groupGet: ActionDefinition<Input> = {
  key: "group-get",
  type: "read",
  resource: "group",
  title: "Get Group",
  description: "Get one group by ID.",
  params: [
    { key: "group_id", label: "Group ID", type: "string", required: true },
    {
      key: "full",
      label: "Include associations",
      type: "boolean",
      hint: "Include associations (members).",
    },
    {
      key: "client_id",
      label: "Client ID",
      type: "string",
      hint: "Act on a client account instead of the company account. Partner accounts only.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request("GET", `/groups/${seg(input.group_id)}`, {
      query: { full: input.full, client_id: input.client_id },
    });
    return recordResult(env);
  },
};

export default groupGet;
