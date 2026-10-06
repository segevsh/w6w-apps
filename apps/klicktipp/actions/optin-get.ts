import type { ActionDefinition } from "@w6w/types";
import { kt, seg } from "../lib/client.ts";

interface Input {
  listId: number;
}

/** Return the complete configuration of one opt-in process. */
const optinGet: ActionDefinition<Input> = {
  key: "optin-get",
  type: "read",
  resource: "optin",
  title: "Get Opt-in Process",
  description: "Return the complete configuration of one opt-in process.",
  params: [
    {
      key: "listId",
      label: "Opt-in process ID",
      type: "number",
      required: true,
      validation: { min: 1, integer: true },
    },
  ],
  output: [{ key: "optin", type: "object", label: "Opt-in process" }],

  async execute(input, ctx) {
    ctx.log("info", "optin-get");
    const optin = await kt(ctx, "GET", `/list/${seg(input.listId, "listId")}`);
    return { optin };
  },
};

export default optinGet;
