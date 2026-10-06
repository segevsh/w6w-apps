import type { ActionDefinition } from "@w6w/types";
import { kt, seg } from "../lib/client.ts";

interface Input {
  subscriberId: string;
}

/** Return the complete record of one contact by contact ID or contact key. */
const subscriberGet: ActionDefinition<Input> = {
  key: "subscriber-get",
  type: "read",
  resource: "subscriber",
  title: "Get Contact",
  description: "Return the complete record of one contact by contact ID or contact key.",
  params: [
    {
      key: "subscriberId",
      label: "Contact ID or key",
      type: "string",
      required: true,
      hint: "The numeric contact ID, or the alphanumeric contact key; both work.",
    },
  ],
  output: [{ key: "subscriber", type: "object", label: "Contact" }],

  async execute(input, ctx) {
    ctx.log("info", "subscriber-get");
    const subscriber = await kt(
      ctx,
      "GET",
      `/subscriber/${seg(input.subscriberId, "subscriberId")}`,
    );
    return { subscriber };
  },
};

export default subscriberGet;
