import type { ActionDefinition } from "@w6w/types";
import { MixmaxClient } from "../lib/client.ts";

interface Input {
  name: string;
  email: string;
}

const unsubscribeAdd: ActionDefinition<Input> = {
  key: "unsubscribe-add",
  type: "perform",
  resource: "unsubscribe",
  title: "Add Unsubscribe",
  description:
    "Add a contact to the unsubscribe list so no sequence from any of your teams emails them.",
  idempotent: true,
  params: [
    { key: "name", label: "Name", type: "string", required: true, hint: "Contact name." },
    { key: "email", label: "Email", type: "string", required: true, hint: "Contact email." },
  ],
  output: [{ key: "added", type: "boolean", label: "Added" }],

  async execute(input, ctx) {
    await new MixmaxClient(ctx).request("POST", "/unsubscribes", {
      body: { name: input.name, email: input.email },
    });
    return { added: true };
  },
};

export default unsubscribeAdd;
