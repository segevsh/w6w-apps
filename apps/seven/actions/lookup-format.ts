import type { ActionDefinition } from "@w6w/types";
import { asObject, SevenClient, toList } from "../lib/client.ts";

/** `GET /api/lookup/format` — national and international format, carrier and network type (no porting data). */
interface Input {
  number: string | string[];
}

const lookupFormat: ActionDefinition<Input> = {
  key: "lookup-format",
  type: "read",
  resource: "lookup",
  title: "Format Number",
  description: "Format a phone number and read its carrier, country and network type.",
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
    { key: "international", type: "string", label: "E.164 number with +" },
    { key: "national", type: "string", label: "National format" },
    { key: "country_iso", type: "string", label: "Country ISO code" },
    { key: "carrier", type: "string", label: "Carrier" },
    { key: "network_type", type: "string", label: "mobile, landline, ..." },
  ],

  async execute(input, ctx) {
    const numbers = toList(input.number);
    const body = await new SevenClient(ctx).request("GET", "/lookup/format", {
      query: { number: numbers.join(",") },
    });
    return asObject(body, "results");
  },
};

export default lookupFormat;
