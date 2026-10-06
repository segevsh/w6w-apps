import type { ActionDefinition } from "@w6w/types";
import { camelKeys, seg, ses } from "../lib/api.ts";

/**
 * GetEmailIdentity — `GET /v2/email/identities/{EmailIdentity}`.
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_GetEmailIdentity.html
 */
interface Input {
  emailIdentity: string;
}

const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "identity-get",
  type: "read",
  resource: "identity",
  title: "Get Identity",
  description:
    "Read one sending identity: verification status, DKIM tokens, MAIL FROM and feedback-forwarding settings.",
  params: [
    {
      key: "emailIdentity",
      label: "Identity",
      type: "string",
      required: true,
      hint: "An email address or a domain, e.g. you@example.com or example.com.",
    },
  ],
  output: [
    { key: "identityType", type: "string", label: "EMAIL_ADDRESS, DOMAIN or MANAGED_DOMAIN" },
    { key: "verifiedForSendingStatus", type: "boolean", label: "Verified for sending" },
    {
      key: "verificationStatus",
      type: "string",
      label: "PENDING, SUCCESS, FAILED, TEMPORARY_FAILURE or NOT_STARTED",
    },
    { key: "dkimAttributes", type: "object", label: "DKIM signing status and CNAME tokens" },
    { key: "mailFromAttributes", type: "object", label: "Custom MAIL FROM domain" },
    {
      key: "feedbackForwardingStatus",
      type: "boolean",
      label: "Bounce/complaint forwarding by email",
    },
    { key: "configurationSetName", type: "string", label: "Default configuration set" },
    { key: "tags", type: "array", label: "Tags" },
  ],

  async execute(input, ctx) {
    const res = await ses<Record<string, unknown>>(ctx, {
      op: "GetEmailIdentity",
      path: `/v2/email/identities/${seg(input.emailIdentity)}`,
    });
    return camelKeys(res);
  },
};

export default action;
