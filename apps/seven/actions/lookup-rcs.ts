import type { ActionDefinition } from "@w6w/types";
import { asObject, SevenClient, toList } from "../lib/client.ts";

/** `GET /api/lookup/rcs` — RCS capabilities of a number for an agent. */
interface Input {
  number: string | string[];
  from?: string;
}

const lookupRcs: ActionDefinition<Input> = {
  key: "lookup-rcs",
  type: "read",
  resource: "lookup",
  title: "RCS Capabilities",
  description: "Read which RCS features a number supports. Cache the result before sending RCS.",
  params: [
    {
      key: "number",
      label: "Number",
      type: "string",
      required: true,
      hint:
        "Phone number in almost any format. The vendor documents comma-separated lists for every lookup; an array answer is returned under `results`.",
    },
    {
      key: "from",
      label: "RCS agent",
      type: "string",
      hint: "Agent identifier to check against. Defaults to the account's first RCS sender ID.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the lookup succeeded" },
    { key: "rcs_capabilities", type: "array", label: "Supported RCS features" },
    { key: "carrier", type: "string", label: "Carrier" },
  ],

  async execute(input, ctx) {
    const numbers = toList(input.number);
    const body = await new SevenClient(ctx).request("GET", "/lookup/rcs", {
      query: { number: numbers.join(","), from: input.from },
    });
    return asObject(body, "results");
  },
};

export default lookupRcs;
