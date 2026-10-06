import type { ActionDefinition } from "@w6w/types";
import { compact, RaiselyClient, seg } from "../lib/client.ts";
import { privateParam } from "../lib/params.ts";

interface Input {
  uuid: string;
  private?: boolean;
}

const subscriptionGet: ActionDefinition<Input> = {
  key: "subscription-get",
  type: "read",
  resource: "subscription",
  title: "Get Subscription",
  description: "Retrieve one recurring donation subscription by uuid.",
  params: [
    {
      key: "uuid",
      label: "Subscription uuid",
      type: "string",
      required: true,
      hint: "The uuid of the subscription.",
    },

    privateParam(),
  ],
  output: [{ key: "uuid", type: "string", label: "subscription uuid" }],

  async execute(input, ctx) {
    return await new RaiselyClient(ctx).data(`/subscriptions/${seg(input.uuid)}`, {
      query: compact({
        private: input.private,
      }),
    });
  },
};

export default subscriptionGet;
