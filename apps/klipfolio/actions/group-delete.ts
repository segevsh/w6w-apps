import type { ActionDefinition } from "@w6w/types";
import { KlipfolioClient, okResult, seg } from "../lib/client.ts";

interface Input {
  group_id: string;
  client_id?: string;
}

/** `DELETE /groups/{group_id}`. */
const groupDelete: ActionDefinition<Input> = {
  key: "group-delete",
  type: "perform",
  resource: "group",
  title: "Delete Group",
  description: "Permanently delete a group.",
  idempotent: true,
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
    { key: "success", type: "boolean", label: "Whether the call succeeded" },
    { key: "op", type: "string", label: "Operation echoed back, when the API reports one" },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request("DELETE", `/groups/${seg(input.group_id)}`, {
      query: { client_id: input.client_id },
    });
    return okResult(env);
  },
};

export default groupDelete;
