import type { ActionDefinition } from "@w6w/types";
import { digits, RingoverClient } from "../lib/client.ts";
import { NUMBER_OUTPUT } from "../lib/params.ts";

interface Input {
  number: string;
}

const numberGet: ActionDefinition<Input> = {
  key: "number-get",
  type: "read",
  resource: "number",
  title: "Get Number",
  description: "Fetch one team phone number: assignment, capabilities and formats.",
  params: [
    {
      key: "number",
      label: "Phone number",
      type: "string",
      required: true,
      hint: "International format, e.g. 33140000000 or +33140000000.",
    },
  ],
  output: NUMBER_OUTPUT,

  execute(input, ctx) {
    return new RingoverClient(ctx).request("GET", `/numbers/${digits(input.number)}`);
  },
};

export default numberGet;
