import type { ActionDefinition } from "@w6w/types";
import { camelKeys, seg, ses } from "../lib/api.ts";

/**
 * GetSuppressedDestination — `GET /v2/email/suppression/addresses/{EmailAddress}`. An address that is
 * not suppressed is a 404 `NotFoundException`, so this action throws for it.
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_GetSuppressedDestination.html
 */
interface Input {
  emailAddress: string;
}

const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "suppression-get",
  type: "read",
  resource: "suppression",
  title: "Get Suppressed Destination",
  description: "Check whether one address is on the suppression list, and why.",
  params: [
    { key: "emailAddress", label: "Email address", type: "string", required: true },
  ],
  output: [
    { key: "emailAddress", type: "string", label: "Address" },
    { key: "reason", type: "string", label: "BOUNCE or COMPLAINT" },
    { key: "lastUpdateTime", type: "string", label: "When it was last updated" },
    {
      key: "attributes",
      type: "object",
      label: "messageId and feedbackId of the event that caused it",
    },
  ],

  async execute(input, ctx) {
    const res = await ses<{ SuppressedDestination?: Record<string, unknown> }>(ctx, {
      op: "GetSuppressedDestination",
      path: `/v2/email/suppression/addresses/${seg(input.emailAddress)}`,
    });
    return camelKeys(res.SuppressedDestination ?? {});
  },
};

export default action;
