import type { ActionDefinition } from "@w6w/types";
import { OutsetaClient, pathId } from "../lib/client.ts";

interface Input {
  accountUid: string;
  membershipUid: string;
}

/** `DELETE /api/v1/crm/accounts/{accountUid}/memberships/{membershipUid}` — Remove a membership from an account. The person record is kept. */
const removeAccountMember: ActionDefinition<Input> = {
  key: "remove-account-member",
  type: "perform",
  resource: "account",
  title: "Remove Person from Account",
  description: "Remove a membership from an account. The person record is kept.",
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
      key: "membershipUid",
      label: "Membership Uid",
      type: "string",
      hint:
        "The PersonAccount Uid from the account's `PersonAccount` list \u2014 not the person's Uid.",
      required: true,
    },
  ],
  output: [
    {
      key: "deleted",
      type: "boolean",
      label: "Deleted",
    },
    {
      key: "uid",
      type: "string",
      label: "Uid of the deleted record",
    },
  ],

  async execute(input, ctx) {
    await OutsetaClient.fromConnection(ctx).request(
      `/crm/accounts/${pathId(input.accountUid)}/memberships/${pathId(input.membershipUid)}`,
      { method: "DELETE" },
    );
    return { deleted: true, uid: input.membershipUid };
  },
};

export default removeAccountMember;
