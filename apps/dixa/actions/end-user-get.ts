import type { ActionDefinition } from "@w6w/types";
import { DixaClient, encodeId } from "../lib/client.ts";

interface Input {
  userId: string;
}

const endUserGet: ActionDefinition<Input> = {
  key: "end-user-get",
  type: "read",
  resource: "end-user",
  title: "Get End User",
  description: "Fetch one end user by id.",
  params: [{ key: "userId", label: "End user id", type: "string", required: true }],
  output: [{ key: "data", type: "object", label: "The end user" }],

  execute(input, ctx) {
    return new DixaClient(ctx).json(`/endusers/${encodeId(input.userId, "userId")}`);
  },
};

export default endUserGet;
