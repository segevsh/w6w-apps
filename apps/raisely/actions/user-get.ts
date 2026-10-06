import type { ActionDefinition } from "@w6w/types";
import { compact, RaiselyClient, seg } from "../lib/client.ts";
import { privateParam } from "../lib/params.ts";

interface Input {
  uuid: string;
  private?: boolean;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description:
    "Retrieve one user (supporter or donor) by uuid. The user's login accessToken is stripped from the result.",
  params: [
    {
      key: "uuid",
      label: "User uuid",
      type: "string",
      required: true,
      hint: "The uuid of the user.",
    },

    privateParam(),
  ],
  output: [{ key: "uuid", type: "string", label: "user uuid" }],

  async execute(input, ctx) {
    return await new RaiselyClient(ctx).data(`/users/${seg(input.uuid)}`, {
      query: compact({
        private: input.private,
      }),
    });
  },
};

export default userGet;
