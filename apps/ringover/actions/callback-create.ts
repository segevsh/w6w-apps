import type { ActionDefinition } from "@w6w/types";
import { compact, digitsInt, RingoverClient } from "../lib/client.ts";

interface Input {
  toNumber: string;
  fromNumber?: string;
  device: string;
  timeout?: number;
  clir?: boolean;
}

const callbackCreate: ActionDefinition<Input> = {
  key: "callback-create",
  type: "perform",
  resource: "call",
  title: "Place Callback",
  description:
    "Ring one of your users first and, when they pick up, dial the recipient. Adds call-redirection fees.",
  idempotent: false,
  params: [
    {
      key: "toNumber",
      label: "Recipient number",
      type: "string",
      required: true,
      hint: "Who to call, in international format.",
    },
    {
      key: "fromNumber",
      label: "User number",
      type: "string",
      hint: "The number of the user to ring first. Defaults to the key owner.",
    },
    {
      key: "device",
      label: "Device to ring",
      type: "select",
      required: true,
      options: [
        { value: "ALL", label: "All devices" },
        { value: "APP", label: "Mobile/desktop app" },
        { value: "WEB", label: "Web app" },
        { value: "SIP", label: "SIP phone" },
        { value: "MOB", label: "Mobile" },
        { value: "EXT", label: "External" },
      ],
      default: "ALL",
    },
    {
      key: "timeout",
      label: "Ring timeout (seconds)",
      type: "number",
      validation: { integer: true },
    },
    { key: "clir", label: "Hide caller ID", type: "boolean" },
  ],
  output: [
    { key: "call_id", type: "number", label: "Call ID" },
    { key: "channel_id", type: "number", label: "Channel ID" },
  ],

  execute(input, ctx) {
    return new RingoverClient(ctx).request("POST", "/callback", {
      body: compact({
        to_number: digitsInt(input.toNumber),
        from_number: input.fromNumber ? digitsInt(input.fromNumber) : undefined,
        device: input.device,
        timeout: input.timeout,
        clir: input.clir,
      }),
    });
  },
};

export default callbackCreate;
