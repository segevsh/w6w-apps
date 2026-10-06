import type { ActionDefinition } from "@w6w/types";
import { asObject, SevenClient, toList } from "../lib/client.ts";

/** `GET /api/lookup/cnam` — caller-ID name. A miss answers only {code: 600}, which this app raises as an error. */
interface Input {
  number: string | string[];
}

const lookupCnam: ActionDefinition<Input> = {
  key: "lookup-cnam",
  type: "read",
  resource: "lookup",
  title: "CNAM Lookup",
  description:
    "Look up the caller-ID name for a number. Mostly meaningful for US/Canada (NANP); elsewhere the value is often a country or carrier name. Billed per valid number.",
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
    { key: "success", type: "string", label: "true on a hit" },
    { key: "code", type: "string", label: "Return code (100 success)" },
    { key: "number", type: "string", label: "The number" },
    { key: "name", type: "string", label: "Caller-ID name" },
  ],

  async execute(input, ctx) {
    const numbers = toList(input.number);
    const body = await new SevenClient(ctx).request("GET", "/lookup/cnam", {
      query: { number: numbers.join(",") },
    });
    return asObject(body, "results");
  },
};

export default lookupCnam;
