import type { ActionDefinition } from "@w6w/types";
import { compact, ElasticClient, toList } from "../lib/client.ts";
import { buildContent, buildOptions, contentParams } from "../lib/email.ts";

type Input = Record<string, unknown>;

/** `POST /v4/emails/transactional` — recipients are visible to each other. */
const emailSend: ActionDefinition<Input> = {
  key: "email-send",
  type: "perform",
  resource: "email",
  title: "Send Email",
  description:
    "Send one transactional email. To, CC and BCC recipients all receive the same message and " +
    "the To/CC addresses see each other. Use Send Bulk Email for per-recipient merge sends.",
  idempotent: false,
  params: [
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      hint: "Comma-separated email addresses.",
    },
    { key: "cc", label: "CC", type: "string", hint: "Comma-separated email addresses." },
    { key: "bcc", label: "BCC", type: "string", hint: "Comma-separated email addresses." },
    ...contentParams,
  ],
  output: [
    { key: "TransactionID", type: "string", label: "Transaction id (use with Get Email Status)" },
    { key: "MessageID", type: "string", label: "Message id" },
  ],
  async execute(input, ctx) {
    const to = toList(input.to as string | undefined);
    if (!to) throw new Error("At least one To recipient is required");
    const body = compact({
      Recipients: compact({
        To: to,
        CC: toList(input.cc as string | undefined),
        BCC: toList(input.bcc as string | undefined),
      }),
      Content: buildContent(input),
      Options: buildOptions(input),
    });
    return await new ElasticClient(ctx).json("/emails/transactional", { method: "POST", body });
  },
};

export default emailSend;
