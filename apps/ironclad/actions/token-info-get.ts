import type { ActionDefinition } from "@w6w/types";
import { IroncladClient } from "../lib/client.ts";

type Input = Record<string, never>;

const tokenInfoGet: ActionDefinition<Input> = {
  key: "token-info-get",
  type: "read",
  resource: "account",
  title: "Get Token User Info",
  description:
    "Return the user, company and granted OAuth scopes behind this connection's token. Needs no resource scope, so it also answers for a connection that can do little else.",
  params: [],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "companyName", type: "string", label: "Company" },
    { key: "scopes", type: "array", label: "Granted scopes" },
  ],

  execute(_input, ctx) {
    return new IroncladClient(ctx).userInfo();
  },
};

export default tokenInfoGet;
