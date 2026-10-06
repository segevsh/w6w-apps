import type { ActionDefinition } from "@w6w/types";
import { PylonClient, seg } from "../lib/client.ts";
import { ACCOUNT_OUTPUT, idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `GET /accounts/{id}` — accepts the Pylon ID or an external ID. */
const accountGet: ActionDefinition<Input> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Fetch one account by its Pylon ID or one of its external IDs.",
  params: [idParam("Account ID or external ID")],
  output: ACCOUNT_OUTPUT,

  execute(input, ctx) {
    return new PylonClient(ctx).one("GET", `/accounts/${seg(input.id)}`);
  },
};

export default accountGet;
