import type { ActionDefinition } from "@w6w/types";
import { buildBody, OutsetaClient, pathId } from "../lib/client.ts";

interface Input {
  accountUid: string;
  name?: string;
  clientIdentifier?: string;
  properties?: unknown;
}

/** `PUT /api/v1/crm/accounts/{accountUid}` — Update properties on an account. Billing stage is not editable — it follows subscription activity. */
const updateAccount: ActionDefinition<Input> = {
  key: "update-account",
  type: "perform",
  resource: "account",
  title: "Update Account",
  description:
    "Update properties on an account. Billing stage is not editable \u2014 it follows subscription activity.",
  idempotent: true,
  params: [
    {
      key: "accountUid",
      label: "Account Uid",
      type: "string",
      hint: "The account's Uid (the short alphanumeric id, e.g. `wZmNZm2O`).",
      required: true,
    },
    {
      key: "name",
      label: "Name",
      type: "string",
    },
    {
      key: "clientIdentifier",
      label: "Client identifier",
      type: "string",
    },
    {
      key: "properties",
      label: "Additional properties",
      type: "json",
      advanced: true,
      hint:
        "Extra Outseta properties (including custom ones) as a JSON object, merged into the body exactly as they appear on a GET. The typed fields above win on a clash.",
    },
  ],
  output: [
    {
      key: "Uid",
      type: "string",
      label: "Uid",
    },
    {
      key: "Created",
      type: "string",
      label: "Created",
    },
    {
      key: "Updated",
      type: "string",
      label: "Updated",
    },
  ],

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(`/crm/accounts/${pathId(input.accountUid)}`, {
      method: "PUT",
      body: buildBody(
        { Name: input.name, ClientIdentifier: input.clientIdentifier },
        input.properties,
      ),
    });
  },
};

export default updateAccount;
