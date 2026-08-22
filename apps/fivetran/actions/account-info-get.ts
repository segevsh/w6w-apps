import type { ActionDefinition } from "@w6w/types";
import { FivetranClient } from "../lib/client.ts";

/**
 * `GET /v1/account/info` — which account this key belongs to, and on what plan.
 *
 * The plan is the operationally interesting part: a **trial** account is capped
 * at **500** API requests an hour against **20,000** on a paid plan, and setup
 * tests at **50** an hour against 2,500. A workflow that runs comfortably in
 * one will not run in the other, and nothing about an individual request says
 * which you are on until a `429` arrives.
 *
 * It is also the cheapest authenticated call in the API, which is why the
 * connection test and the `quota` health check both use it.
 */
const action: ActionDefinition = {
  key: "account-info-get",
  type: "read",
  resource: "account",
  title: "Get account info",
  description:
    "Which account this key belongs to and on what plan — a trial is capped at 500 API requests " +
    "an hour against 20,000, and nothing else tells you which you are on.",
  params: [],
  output: [
    { key: "id", type: "string", label: "Account ID" },
    { key: "name", type: "string", label: "Account name" },
    { key: "account_type", type: "string", label: "The plan, which sets the rate limit" },
    { key: "isTrial", type: "boolean", label: "True when the tighter limits apply" },
    { key: "country", type: "string", label: "Account country" },
  ],

  async execute(_input, ctx) {
    const info = await new FivetranClient(ctx).request<{ account_type?: string }>(
      "/v1/account/info",
    );
    const plan = String(info?.account_type ?? "").toLowerCase();
    return { ...info, isTrial: plan.includes("trial") };
  },
};

export default action;
