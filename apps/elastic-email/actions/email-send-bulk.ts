import type { ActionDefinition } from "@w6w/types";
import { compact, ElasticClient, toList } from "../lib/client.ts";
import { buildContent, buildOptions, contentParams } from "../lib/email.ts";

type Input = Record<string, unknown>;

/** Accept emails (string / list) or `{email, fields}` objects; emit the vendor's recipients. */
export function buildRecipients(raw: unknown): Array<Record<string, unknown>> {
  const items: unknown[] = typeof raw === "string"
    ? (raw.trim().startsWith("[") ? JSON.parse(raw) : toList(raw) ?? [])
    : Array.isArray(raw)
    ? raw
    : [];
  const out = items.map((item) => {
    if (typeof item === "string") return { Email: item.trim() };
    const o = (item ?? {}) as Record<string, unknown>;
    const email = String(o.email ?? o.Email ?? "").trim();
    return compact({ Email: email, Fields: o.fields ?? o.Fields });
  });
  if (out.length === 0 || out.some((r) => !r.Email)) {
    throw new Error("Recipients must be a non-empty list of email addresses or {email, fields}");
  }
  return out;
}

/** `POST /v4/emails` — each recipient gets their own message with their own merge fields. */
const emailSendBulk: ActionDefinition<Input> = {
  key: "email-send-bulk",
  type: "perform",
  resource: "email",
  title: "Send Bulk Email",
  description:
    "Send a merge email to many recipients. Each recipient receives a separate message, " +
    "personalised with their own `fields`, and cannot see the others.",
  idempotent: false,
  params: [
    {
      key: "recipients",
      label: "Recipients",
      type: "json",
      required: true,
      hint: 'Array of addresses, or of {"email": "a@b.com", "fields": {"firstname": "Ada"}}.',
    },
    ...contentParams,
  ],
  output: [
    { key: "TransactionID", type: "string", label: "Transaction id (use with Get Email Status)" },
    { key: "MessageID", type: "string", label: "Message id" },
  ],
  async execute(input, ctx) {
    const body = compact({
      Recipients: buildRecipients(input.recipients),
      Content: buildContent(input),
      Options: buildOptions(input),
    });
    return await new ElasticClient(ctx).json("/emails", { method: "POST", body });
  },
};

export default emailSendBulk;
