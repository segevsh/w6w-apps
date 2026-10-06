import type { ActionDefinition } from "@w6w/types";
import { MixmaxClient } from "../lib/client.ts";

interface Input {
  email: string;
}

const unsubscribeRemove: ActionDefinition<Input> = {
  key: "unsubscribe-remove",
  type: "perform",
  resource: "unsubscribe",
  title: "Remove Unsubscribe",
  description: "Remove a contact from the unsubscribe list.",
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", required: true, hint: "Contact email." },
  ],
  output: [{ key: "removed", type: "boolean", label: "Removed" }],

  async execute(input, ctx) {
    await new MixmaxClient(ctx).request("DELETE", "/unsubscribes", {
      body: { email: input.email },
    });
    return { removed: true };
  },
};

export default unsubscribeRemove;
