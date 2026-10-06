import type { ActionDefinition } from "@w6w/types";
import { BrowserlessClient } from "../lib/client.ts";

/**
 * `GET https://api.browserless.io/v1/account/usage` — the Usage API. The vendor
 * documents the call but not the response schema, so the body is passed through
 * untouched under `usage` rather than reshaped into fields that might not exist.
 */
const accountUsageGet: ActionDefinition = {
  key: "account-usage-get",
  type: "read",
  resource: "account",
  title: "Get Account Usage",
  description:
    "Read the account's unit usage from the Browserless Usage API. One unit is 30 seconds of " +
    "browser time; proxy traffic and CAPTCHA solves cost extra.",
  params: [],
  output: [{ key: "usage", type: "object", label: "Usage report, as returned by Browserless" }],

  async execute(_input, ctx) {
    const usage = await new BrowserlessClient(ctx).json("/v1/account/usage", { account: true });
    return { usage };
  },
};

export default accountUsageGet;
