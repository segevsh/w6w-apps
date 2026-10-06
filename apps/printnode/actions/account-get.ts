import type { ActionDefinition } from "@w6w/types";
import { PrintNodeClient } from "../lib/client.ts";

/**
 * `GET /whoami` — the account the API key belongs to. The response carries the
 * account holder's name and email, plan credits, computer count and print
 * total. It does not contain the API key (checked against the documented
 * response).
 */
const accountGet: ActionDefinition<Record<string, never>> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Fetch the PrintNode account the connected API key belongs to.",
  params: [],
  output: [
    { key: "id", type: "number", label: "Account ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "credits", type: "number", label: "Credits" },
    { key: "numComputers", type: "number", label: "Computers" },
    { key: "totalPrints", type: "number", label: "Total prints" },
    { key: "state", type: "string", label: "Account state" },
  ],
  execute(_input, ctx) {
    return new PrintNodeClient(ctx).json("/whoami");
  },
};

export default accountGet;
