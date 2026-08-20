import type { ActionDefinition } from "@w6w/types";
import { ReplicateClient } from "../lib/client.ts";

/**
 * `GET /account` — verified against Replicate's OpenAPI document
 * (`account.get`).
 *
 * Who this token belongs to. Worth having because a Replicate token is
 * unscoped and spends money: "which account is this workflow billing" has a
 * real answer, and it is here.
 *
 * It does **not** carry a balance or a spend figure — Replicate publishes
 * neither, which is why this app's `quota` check is a declared absence.
 */
const action: ActionDefinition = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get the account",
  description: "Whose token this is. Replicate exposes no balance or spend figure.",
  params: [],
  output: [
    { key: "type", type: "string", label: "user or organization" },
    { key: "username", type: "string", label: "Username" },
    { key: "name", type: "string", label: "Display name" },
    { key: "github_url", type: "string", label: "GitHub URL" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "getting the Replicate account", {});
    return await new ReplicateClient(ctx).request("/account");
  },
};

export default action;
