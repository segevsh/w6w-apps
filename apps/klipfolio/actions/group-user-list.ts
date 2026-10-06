import type { ActionDefinition } from "@w6w/types";
import { KlipfolioClient, listResult, seg } from "../lib/client.ts";

interface Input {
  group_id: string;
  client_id?: string;
}

/** `GET /groups/{group_id}/users`. */
const groupUserList: ActionDefinition<Input> = {
  key: "group-user-list",
  type: "read",
  resource: "group",
  title: "List Group Users",
  description: "List the users in a group.",
  params: [
    { key: "group_id", label: "Group ID", type: "string", required: true },
    {
      key: "client_id",
      label: "Client ID",
      type: "string",
      hint: "Act on a client account instead of the company account. Partner accounts only.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Result rows" },
    { key: "count", type: "number", label: "Rows in this page" },
    { key: "total", type: "number", label: "Total rows" },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request(
      "GET",
      `/groups/${seg(input.group_id)}/users`,
      { query: { client_id: input.client_id } },
    );
    return listResult(env);
  },
};

export default groupUserList;
