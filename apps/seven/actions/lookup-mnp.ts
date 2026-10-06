import type { ActionDefinition } from "@w6w/types";
import { asObject, SevenClient, toList } from "../lib/client.ts";

/** `GET /api/lookup/mnp` — network operator of a number via Mobile Number Portability. */
interface Input {
  number: string | string[];
}

const lookupMnp: ActionDefinition<Input> = {
  key: "lookup-mnp",
  type: "read",
  resource: "lookup",
  title: "MNP Lookup",
  description:
    "Find the current network operator of a number, including whether it was ported. Billed per lookup.",
  params: [
    {
      key: "number",
      label: "Number",
      type: "string",
      required: true,
      hint:
        "Phone number in almost any format. The vendor documents comma-separated lists for every lookup; an array answer is returned under `results`.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the lookup succeeded" },
    { key: "code", type: "number", label: "Return code (100 success)" },
    { key: "price", type: "number", label: "Price" },
    { key: "mnp", type: "object", label: "country, network, mccmnc, isPorted, network_type" },
  ],

  async execute(input, ctx) {
    const numbers = toList(input.number);
    const body = await new SevenClient(ctx).request("GET", "/lookup/mnp", {
      query: { number: numbers.join(",") },
    });
    return asObject(body, "results");
  },
};

export default lookupMnp;
