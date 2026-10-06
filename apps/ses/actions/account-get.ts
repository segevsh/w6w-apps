import type { ActionDefinition } from "@w6w/types";
import { camelKeys, ses } from "../lib/api.ts";

/**
 * GetAccount — `GET /v2/email/account`.
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_GetAccount.html
 */
type Input = Record<string, never>;

const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description:
    "Read this region's SES account state: sending quota, production access, enforcement and suppression settings.",
  params: [],
  output: [
    { key: "sendingEnabled", type: "boolean", label: "Sending enabled" },
    { key: "productionAccessEnabled", type: "boolean", label: "Out of the sandbox" },
    { key: "enforcementStatus", type: "string", label: "Enforcement status" },
    { key: "sendQuota", type: "object", label: "max24HourSend, maxSendRate, sentLast24Hours" },
    { key: "details", type: "object", label: "Account details and review status" },
    { key: "suppressionAttributes", type: "object", label: "Account-level suppression settings" },
  ],

  async execute(_input, ctx) {
    const res = await ses<Record<string, unknown>>(ctx, {
      op: "GetAccount",
      path: "/v2/email/account",
    });
    return camelKeys(res);
  },
};

export default action;
