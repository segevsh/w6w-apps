import type { ActionDefinition } from "@w6w/types";
import { compact, RaiselyClient, seg } from "../lib/client.ts";
import { privateParam } from "../lib/params.ts";

interface Input {
  uuid: string;
  private?: boolean;
}

const donationGet: ActionDefinition<Input> = {
  key: "donation-get",
  type: "read",
  resource: "donation",
  title: "Get Donation",
  description: "Retrieve one donation by uuid.",
  params: [
    {
      key: "uuid",
      label: "Donation uuid",
      type: "string",
      required: true,
      hint: "The uuid of the donation.",
    },

    privateParam(),
  ],
  output: [{ key: "uuid", type: "string", label: "donation uuid" }],

  async execute(input, ctx) {
    return await new RaiselyClient(ctx).data(`/donations/${seg(input.uuid)}`, {
      query: compact({
        private: input.private,
      }),
    });
  },
};

export default donationGet;
