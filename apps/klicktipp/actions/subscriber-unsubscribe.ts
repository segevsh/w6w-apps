import type { ActionDefinition } from "@w6w/types";
import { expectTrue, kt } from "../lib/client.ts";

interface Input {
  email: string;
}

/** Unsubscribe a contact by email so it receives no further communication. */
const subscriberUnsubscribe: ActionDefinition<Input> = {
  key: "subscriber-unsubscribe",
  type: "perform",
  resource: "subscriber",
  title: "Unsubscribe Contact",
  description: "Unsubscribe a contact by email so it receives no further communication.",
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Unsubscribed" }],

  async execute(input, ctx) {
    ctx.log("info", "subscriber-unsubscribe");
    const res = await kt(ctx, "POST", "/subscriber/unsubscribe", { body: { email: input.email } });
    return { success: expectTrue(res, "unsubscribe") };
  },
};

export default subscriberUnsubscribe;
