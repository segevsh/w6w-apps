import type { ActionDefinition } from "@w6w/types";
import { compact, RaiselyClient, seg } from "../lib/client.ts";
import { privateParam } from "../lib/params.ts";

interface Input {
  uuid: string;
  private?: boolean;
}

const tagGet: ActionDefinition<Input> = {
  key: "tag-get",
  type: "read",
  resource: "tag",
  title: "Get Tag",
  description: "Retrieve one tag by uuid.",
  params: [
    {
      key: "uuid",
      label: "Tag uuid",
      type: "string",
      required: true,
      hint: "The uuid of the tag.",
    },

    privateParam(),
  ],
  output: [{ key: "uuid", type: "string", label: "tag uuid" }],

  async execute(input, ctx) {
    return await new RaiselyClient(ctx).data(`/tags/${seg(input.uuid)}`, {
      query: compact({
        private: input.private,
      }),
    });
  },
};

export default tagGet;
