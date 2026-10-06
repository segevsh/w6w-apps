import type { ActionDefinition } from "@w6w/types";
import {
  MailerSendClient,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
  redactSecrets,
} from "../lib/client.ts";

interface Input extends PageInput {
  domainId: string;
}

const listWebhooks: ActionDefinition<Input> = {
  key: "list-webhooks",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description:
    "List a domain's webhooks (GET /v1/webhooks). `domain_id` is required by the API. Any signing-secret field is stripped from the result.",
  params: [{ key: "domainId", label: "Domain ID", type: "string", required: true }, ...PAGE_PARAMS],
  output: PAGE_OUTPUT,

  async execute(input, ctx) {
    const page = await new MailerSendClient(ctx).json("/webhooks", {
      query: { domain_id: input.domainId, ...pageQuery(input) },
    });
    return redactSecrets(page);
  },
};

export default listWebhooks;
