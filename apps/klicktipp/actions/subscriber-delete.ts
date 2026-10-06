import type { ActionDefinition } from "@w6w/types";
import { expectTrue, kt, seg } from "../lib/client.ts";

interface Input {
  subscriberId: string;
}

/** Permanently delete a contact by contact ID or contact key. */
const subscriberDelete: ActionDefinition<Input> = {
  key: "subscriber-delete",
  type: "perform",
  resource: "subscriber",
  title: "Delete Contact",
  description: "Permanently delete a contact by contact ID or contact key.",
  idempotent: true,
  params: [
    {
      key: "subscriberId",
      label: "Contact ID or key",
      type: "string",
      required: true,
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    ctx.log("info", "subscriber-delete");
    const res = await kt(ctx, "DELETE", `/subscriber/${seg(input.subscriberId, "subscriberId")}`);
    return { success: expectTrue(res, "delete") };
  },
};

export default subscriberDelete;
