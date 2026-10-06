import type { ActionDefinition } from "@w6w/types";
import { expectTrue, kt } from "../lib/client.ts";

interface Input {
  email: string;
}

/** Unsubscribe a contact through a Listbuilding API key so it receives no further communication. Needs a Listbuilding API Key connection. */
const listbuildingSignoff: ActionDefinition<Input> = {
  key: "listbuilding-signoff",
  type: "perform",
  resource: "listbuilding",
  title: "Listbuilding: Unsubscribe Contact",
  description:
    "Unsubscribe a contact through a Listbuilding API key so it receives no further communication. Needs a Listbuilding API Key connection.",
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Done" }],

  async execute(input, ctx) {
    ctx.log("info", "listbuilding-signoff");
    const res = await kt(ctx, "POST", "/subscriber/signoff", { body: { email: input.email } });
    return { success: expectTrue(res, "signoff") };
  },
};

export default listbuildingSignoff;
