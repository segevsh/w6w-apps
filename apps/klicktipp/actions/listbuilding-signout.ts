import type { ActionDefinition } from "@w6w/types";
import { expectTrue, kt } from "../lib/client.ts";

interface Input {
  email: string;
}

/** Remove the key's tag from a contact through a Listbuilding API key. Needs a Listbuilding API Key connection. */
const listbuildingSignout: ActionDefinition<Input> = {
  key: "listbuilding-signout",
  type: "perform",
  resource: "listbuilding",
  title: "Listbuilding: Remove Key's Tag from Contact",
  description:
    "Remove the key's tag from a contact through a Listbuilding API key. Needs a Listbuilding API Key connection.",
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Done" }],

  async execute(input, ctx) {
    ctx.log("info", "listbuilding-signout");
    const res = await kt(ctx, "POST", "/subscriber/signout", { body: { email: input.email } });
    return { success: expectTrue(res, "signout") };
  },
};

export default listbuildingSignout;
