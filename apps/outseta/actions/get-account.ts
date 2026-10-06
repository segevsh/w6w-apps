import type { ActionDefinition } from "@w6w/types";
import { OutsetaClient, pathId } from "../lib/client.ts";

interface Input {
  accountUid: string;
  fields?: string;
}

/** `GET /api/v1/crm/accounts/{accountUid}` — Retrieve one account by Uid. Use `fields` to include the current subscription and plan. */
const getAccount: ActionDefinition<Input> = {
  key: "get-account",
  type: "read",
  resource: "account",
  title: "Get Account",
  description:
    "Retrieve one account by Uid. Use `fields` to include the current subscription and plan.",
  params: [
    {
      key: "accountUid",
      label: "Account Uid",
      type: "string",
      hint: "The account's Uid (the short alphanumeric id, e.g. `wZmNZm2O`).",
      required: true,
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint: "e.g. `Uid,Name,CurrentSubscription.Plan.*`.",
      advanced: true,
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
      method: "GET",
      query: { fields: input.fields },
    });
  },
};

export default getAccount;
