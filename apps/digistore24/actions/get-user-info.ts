import type { ActionDefinition } from "@w6w/types";
import { Ds24Client } from "../lib/client.ts";

type Input = Record<string, never>;

const getUserInfo: ActionDefinition<Input> = {
  key: "get-user-info",
  type: "read",
  title: "Get User Info",
  description: "Return the account the API key belongs to: user id, login name and granted roles.",
  params: [],
  output: [
    { key: "user_id", type: "number", label: "User ID" },
    { key: "user_name", type: "string", label: "Digistore ID (login name)" },
    { key: "granted_roles", type: "string", label: "Role codes" },
    { key: "granted_roles_msg", type: "string", label: "Role names" },
  ],

  execute(_input, ctx) {
    return new Ds24Client(ctx).call("getUserInfo", {});
  },
};

export default getUserInfo;
