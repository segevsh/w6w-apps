import type { ActionDefinition } from "@w6w/types";
import { camelKeys, ses, toTags } from "../lib/api.ts";

/**
 * CreateEmailIdentity — `POST /v2/email/identities`. Creating an identity that already exists is
 * a 400 `AlreadyExistsException`.
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_CreateEmailIdentity.html
 */
interface Input {
  emailIdentity: string;
  configurationSetName?: string;
  tags?: unknown;
}

const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "identity-create",
  type: "perform",
  resource: "identity",
  title: "Create Identity",
  description:
    "Register an email address or domain as a sending identity; SES emails a verification link for an address and returns DKIM tokens for a domain.",
  idempotent: false,
  params: [
    {
      key: "emailIdentity",
      label: "Identity",
      type: "string",
      required: true,
      hint: "An email address or a domain.",
    },
    {
      key: "configurationSetName",
      label: "Configuration set",
      type: "string",
      hint: "Default configuration set for mail sent from this identity.",
    },
    { key: "tags", label: "Tags", type: "json", hint: 'An object like {"team":"growth"}.' },
  ],
  output: [
    { key: "identityType", type: "string", label: "EMAIL_ADDRESS or DOMAIN" },
    { key: "verifiedForSendingStatus", type: "boolean", label: "Verified for sending" },
    {
      key: "dkimAttributes",
      type: "object",
      label: "DKIM status and the CNAME tokens to publish in DNS",
    },
  ],

  async execute(input, ctx) {
    const res = await ses<Record<string, unknown>>(ctx, {
      op: "CreateEmailIdentity",
      method: "POST",
      path: "/v2/email/identities",
      body: {
        EmailIdentity: input.emailIdentity,
        ConfigurationSetName: input.configurationSetName || undefined,
        Tags: toTags(input.tags)?.map(({ Name, Value }) => ({ Key: Name, Value })),
      },
    });
    return camelKeys(res);
  },
};

export default action;
