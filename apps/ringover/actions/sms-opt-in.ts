import type { ActionDefinition } from "@w6w/types";
import { RingoverClient } from "../lib/client.ts";

interface Input {
  phoneNumber: string;
}

const smsOptIn: ActionDefinition<Input> = {
  key: "sms-opt-in",
  type: "perform",
  resource: "sms",
  title: "Opt Back In to SMS",
  description:
    "Remove a number from the team's outbound SMS opt-out list so SMS can be sent to it again.",
  idempotent: true,
  params: [
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
      required: true,
      hint: "International format, with or without +.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Done" },
    { key: "phoneNumber", type: "string", label: "Phone number" },
  ],

  async execute(input, ctx) {
    await new RingoverClient(ctx).request("POST", "/sms/opt-in", {
      body: { phone_number: String(input.phoneNumber).trim() },
    });
    return { ok: true, phoneNumber: input.phoneNumber };
  },
};

export default smsOptIn;
