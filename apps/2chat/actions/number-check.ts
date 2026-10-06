import type { ActionDefinition } from "@w6w/types";
import { seg, TwoChatClient } from "../lib/client.ts";

interface Input {
  yourNumber: string;
  numberToCheck: string;
}

const numberCheck: ActionDefinition<Input> = {
  key: "number-check",
  type: "read",
  resource: "number",
  title: "Check Number on WhatsApp",
  description: "Check whether a phone number has a WhatsApp account (GET " +
    "/whatsapp/check-number/{your-number}/{number-to-check}). Counts against a separate number-check " +
    "quota. If `number_id` differs from the number you checked, send to `number_id`.",
  params: [
    {
      key: "yourNumber",
      label: "Your number",
      type: "string",
      required: true,
      hint: "The number connected to 2Chat.",
    },
    {
      key: "numberToCheck",
      label: "Number to check",
      type: "string",
      required: true,
    },
  ],
  output: [
    { key: "is_valid", type: "boolean", label: "Syntactically valid" },
    { key: "on_whatsapp", type: "boolean", label: "Has a WhatsApp account" },
    { key: "whatsapp_info", type: "object", label: "number_id, business details …" },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    return client.get(
      `/whatsapp/check-number/${seg(input.yourNumber)}/${seg(input.numberToCheck)}`,
    );
  },
};

export default numberCheck;
