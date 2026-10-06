import type { ActionDefinition } from "@w6w/types";
import { OutsetaClient, pathId } from "../lib/client.ts";

interface Input {
  accountUid: string;
  personUid: string;
  isPrimary?: boolean;
  receiveInvoices?: boolean;
  sendWelcomeEmail?: boolean;
}

/** `POST /api/v1/crm/accounts/{accountUid}/memberships` — Attach an existing person to an existing account, optionally sending them a welcome email. */
const addAccountMember: ActionDefinition<Input> = {
  key: "add-account-member",
  type: "perform",
  resource: "account",
  title: "Add Person to Account",
  description:
    "Attach an existing person to an existing account, optionally sending them a welcome email.",
  idempotent: false,
  params: [
    {
      key: "accountUid",
      label: "Account Uid",
      type: "string",
      hint: "The account's Uid (the short alphanumeric id, e.g. `wZmNZm2O`).",
      required: true,
    },
    {
      key: "personUid",
      label: "Person Uid",
      type: "string",
      hint: "The person's Uid (the short alphanumeric id, e.g. `wZmNZm2O`).",
      required: true,
    },
    {
      key: "isPrimary",
      label: "Primary contact",
      type: "boolean",
    },
    {
      key: "receiveInvoices",
      label: "Receives invoices",
      type: "boolean",
    },
    {
      key: "sendWelcomeEmail",
      label: "Send welcome email",
      type: "boolean",
      hint: "Send the person a welcome email.",
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
    return OutsetaClient.fromConnection(ctx).request(
      `/crm/accounts/${pathId(input.accountUid)}/memberships`,
      {
        method: "POST",
        query: { sendWelcomeEmail: input.sendWelcomeEmail },
        body: {
          Person: { Uid: input.personUid },
          IsPrimary: input.isPrimary,
          ReceiveInvoices: input.receiveInvoices,
        },
      },
    );
  },
};

export default addAccountMember;
