import type { ActionDefinition } from "@w6w/types";
import { OutsetaClient, pathId } from "../lib/client.ts";

interface Input {
  emailListUid: string;
  subscriptionUid: string;
}

/** `DELETE /api/v1/email/lists/{emailListUid}/subscriptions/{subscriptionUid}` — Remove a subscription from an email list. */
const unsubscribeFromEmailList: ActionDefinition<Input> = {
  key: "unsubscribe-from-email-list",
  type: "perform",
  resource: "email-list",
  title: "Remove Email List Subscriber",
  description: "Remove a subscription from an email list.",
  idempotent: true,
  params: [
    {
      key: "emailListUid",
      label: "Email list Uid",
      type: "string",
      hint: "The email list's Uid (the short alphanumeric id, e.g. `wZmNZm2O`).",
      required: true,
    },
    {
      key: "subscriptionUid",
      label: "Subscription Uid",
      type: "string",
      hint: "The subscription's own Uid from the subscribers list \u2014 not the person's Uid.",
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
      `/email/lists/${pathId(input.emailListUid)}/subscriptions/${pathId(input.subscriptionUid)}`,
      { method: "DELETE" },
    );
    return { deleted: true, uid: input.subscriptionUid };
  },
};

export default unsubscribeFromEmailList;
