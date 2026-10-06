import type { ActionDefinition } from "@w6w/types";
import { maskSlack, SevenClient } from "../lib/client.ts";

/**
 * `GET /api/numbers/active` — the numbers booked on the account. `forward_sms_mo.slack.uri` is a
 * Slack incoming-webhook URL (a credential), so it is masked.
 */
const numberActiveList: ActionDefinition<Record<string, never>> = {
  key: "number-active-list",
  type: "search",
  resource: "number",
  title: "List Active Numbers",
  description:
    "List the phone numbers booked on the account, with billing, features and forwarding. A Slack forwarding URL is masked.",
  params: [],
  output: [{ key: "activeNumbers", type: "array", label: "Active numbers" }],

  async execute(_input, ctx) {
    const body = await new SevenClient(ctx).request("GET", "/numbers/active") as {
      activeNumbers?: Array<Record<string, unknown>>;
    };
    return { ...body, activeNumbers: (body.activeNumbers ?? []).map(maskSlack) };
  },
};

export default numberActiveList;
