import type { ActionDefinition } from "@w6w/types";
import { flatten, TerraformClient } from "../lib/client.ts";

/**
 * `GET /api/v2/account/details` — who this token is.
 *
 * ## The answer to "why can this token not create a run"
 *
 * Terraform has three token kinds and they look identical. An **organization**
 * token can create workspaces and teams and cannot create runs or read state;
 * a **team** token reaches only its team's workspaces, and everything else
 * answers 404 as though it did not exist.
 *
 * Nothing in a later 403 or 404 mentions token types. This is where to look.
 *
 * `is-service-account` marks the machine accounts an organisation creates for
 * automation, which is what an automation should be holding rather than a
 * person's own token — a leaver's token disappearing takes the workflow with
 * it.
 */
const action: ActionDefinition = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get the current account",
  description:
    "Who this token is and what kind it is. An ORGANIZATION token cannot create runs or read " +
    "state, and a TEAM token answers 404 for anything outside its team — neither failure " +
    "mentions token types.",
  params: [],
  output: [
    { key: "id", type: "string", label: "The account id" },
    { key: "username", type: "string", label: "The account name" },
    { key: "email", type: "string", label: "Its email address" },
    { key: "serviceAccount", type: "boolean", label: "Whether this is a machine account" },
    { key: "account", type: "object", label: "The flattened account record" },
  ],

  async execute(_input, ctx) {
    const document = await new TerraformClient(ctx).request("/api/v2/account/details");
    const account = flatten(document.data as never) ?? {};

    return {
      id: account.id,
      username: account["username"],
      email: account["email"],
      serviceAccount: account["is-service-account"] === true,
      account,
    };
  },
};

export default action;
