import type { ActionDefinition } from "@w6w/types";
import { RingoverClient } from "../lib/client.ts";

interface Input {
  phoneNumber: string;
}

const smsOptOut: ActionDefinition<Input> = {
  key: "sms-opt-out",
  type: "perform",
  resource: "sms",
  title: "Opt Out of SMS",
  description:
    "Add a number to the team's outbound SMS opt-out list. Later SMS to it are blocked and not charged.",
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
    await new RingoverClient(ctx).request("POST", "/sms/opt-out", {
      body: { phone_number: String(input.phoneNumber).trim() },
    });
    return { ok: true, phoneNumber: input.phoneNumber };
  },
};

export default smsOptOut;
