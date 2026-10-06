import type { ActionDefinition } from "@w6w/types";
import { asObject, SevenClient, toList } from "../lib/client.ts";

/** `GET /api/lookup/hlr` — HLR database query: validity, reachability, porting and roaming. */
interface Input {
  number: string | string[];
}

const lookupHlr: ActionDefinition<Input> = {
  key: "lookup-hlr",
  type: "read",
  resource: "lookup",
  title: "HLR Lookup",
  description:
    "Query the HLR database for a number: is it valid, reachable, ported, roaming? Billed per lookup.",
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
    { key: "status", type: "boolean", label: "Whether the query was accepted" },
    { key: "valid_number", type: "string", label: "valid, not_valid or unknown" },
    { key: "reachable", type: "string", label: "reachable, absent, bad_number or unknown" },
    { key: "ported", type: "string", label: "Porting state" },
    { key: "roaming", type: "string", label: "Roaming state" },
    { key: "current_carrier", type: "object", label: "Current carrier" },
    { key: "original_carrier", type: "object", label: "Original carrier" },
  ],

  async execute(input, ctx) {
    const numbers = toList(input.number);
    const body = await new SevenClient(ctx).request("GET", "/lookup/hlr", {
      query: { number: numbers.join(",") },
    });
    return asObject(body, "results");
  },
};

export default lookupHlr;
