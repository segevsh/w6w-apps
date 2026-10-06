import type { ActionDefinition } from "@w6w/types";
import { encodeId, maskSlack, SevenClient } from "../lib/client.ts";

/** `GET /api/numbers/active/:number` — a Slack forwarding URL is masked. */
interface Input {
  number: string;
}

const numberActiveGet: ActionDefinition<Input> = {
  key: "number-active-get",
  type: "read",
  resource: "number",
  title: "Get Active Number",
  description: "Read one booked phone number's billing, features and forwarding settings.",
  params: [
    {
      key: "number",
      label: "Number",
      type: "string",
      required: true,
      hint: "International format without +, e.g. 49176123456789.",
    },
  ],
  output: [
    { key: "number", type: "string", label: "The number" },
    { key: "country", type: "string", label: "Country" },
    { key: "billing", type: "object", label: "Fees and payment interval" },
    { key: "features", type: "object", label: "sms, a2p_sms, voice" },
    { key: "forward_sms_mo", type: "object", label: "Forwarding to SMS, email and Slack" },
  ],

  async execute(input, ctx) {
    const body = await new SevenClient(ctx).request(
      "GET",
      `/numbers/active/${encodeId(input.number.replace(/^\+/, ""))}`,
    );
    return maskSlack(body as Record<string, unknown>);
  },
};

export default numberActiveGet;
