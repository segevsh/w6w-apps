import type { ActionDefinition } from "@w6w/types";
import { buildBody, OutsetaClient } from "../lib/client.ts";

interface Input {
  name: string;
  clientIdentifier?: string;
  primaryPersonUid?: string;
  isImported?: boolean;
  properties?: unknown;
}

/** `POST /api/v1/crm/accounts` — Add a new account, optionally attaching an existing person as its primary contact. */
const createAccount: ActionDefinition<Input> = {
  key: "create-account",
  type: "perform",
  resource: "account",
  title: "Create Account",
  description: "Add a new account, optionally attaching an existing person as its primary contact.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
    },
    {
      key: "clientIdentifier",
      label: "Client identifier",
      type: "string",
      hint: "Your own id for this account, for correlation.",
    },
    {
      key: "primaryPersonUid",
      label: "Primary person Uid",
      type: "string",
      hint: "An existing person to attach as the primary contact.",
    },
    {
      key: "isImported",
      label: "Imported",
      type: "boolean",
      hint: "Mark the account as imported.",
      advanced: true,
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
    return OutsetaClient.fromConnection(ctx).request(`/crm/accounts`, {
      method: "POST",
      query: { isImported: input.isImported },
      body: buildBody({
        Name: input.name,
        ClientIdentifier: input.clientIdentifier,
        PersonAccount: input.primaryPersonUid
          ? [{ Person: { Uid: input.primaryPersonUid }, IsPrimary: true }]
          : undefined,
      }, input.properties),
    });
  },
};

export default createAccount;
