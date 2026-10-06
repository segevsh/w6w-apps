import type { ActionDefinition } from "@w6w/types";
import { asStringArray, EzTextingClient } from "../lib/client.ts";
import { phoneNumbersParam, statusOutput } from "../lib/params.ts";

/** `POST /v1/blocks` — block outbound texts to the given numbers. */
interface Input {
  phoneNumbers: string[] | string;
}

const outboundBlock: ActionDefinition<Input> = {
  key: "outbound-block",
  type: "perform",
  resource: "message",
  title: "Block Outbound Texts",
  description: "Block outbound texts to one or more phone numbers.",
  idempotent: true,
  params: [phoneNumbersParam("Phone numbers to block")],
  output: [{ key: "phoneNumbers", type: "array", label: "Blocked numbers" }, ...statusOutput],

  async execute(input, ctx) {
    const phoneNumbers = asStringArray(input.phoneNumbers) ?? [];
    if (phoneNumbers.length === 0) throw new Error("phoneNumbers must list at least one number");
    const status = await new EzTextingClient(ctx).status("/blocks", {
      method: "POST",
      body: { phoneNumbers },
    });
    return { phoneNumbers, status };
  },
};

export default outboundBlock;
