import type { ActionDefinition } from "@w6w/types";
import { camelKeys, ses, templateData, toJson, toList, toTags } from "../lib/api.ts";

/**
 * SendBulkEmail — `POST /v2/email/outbound-bulk-emails`. One stored template, up to 50 entries,
 * each with its own recipients and replacement data.
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_SendBulkEmail.html
 *
 * A 200 does NOT mean every entry was sent: each entry has its own `status`
 * (`SUCCESS`, `MESSAGE_REJECTED`, `ACCOUNT_THROTTLED`, …). This action returns the per-entry
 * results and counts, and does not throw when only some entries failed.
 */
interface Entry {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  templateData?: unknown;
}

interface Input {
  from: string;
  templateName: string;
  defaultTemplateData?: unknown;
  entries: unknown;
  replyTo?: string;
  configurationSetName?: string;
  tags?: unknown;
}

interface Output {
  results: Array<{ status: string; error?: string; messageId?: string }>;
  successCount: number;
  failureCount: number;
}

const action: ActionDefinition<Input, Output> = {
  key: "send-bulk-email",
  type: "perform",
  resource: "email",
  title: "Send Bulk Templated Email",
  description:
    "Send one stored template to many recipients (up to 50 per call), each with its own replacement data.",
  idempotent: false,
  params: [
    { key: "from", label: "From", type: "string", required: true },
    { key: "templateName", label: "Template name", type: "string", required: true },
    {
      key: "defaultTemplateData",
      label: "Default template data",
      type: "json",
      hint: "Used for any entry that does not carry its own templateData.",
    },
    {
      key: "entries",
      label: "Entries",
      type: "json",
      required: true,
      hint:
        'Array of {"to": "a@x.com" | ["a@x.com"], "cc"?, "bcc"?, "templateData"?: {...}}. Max 50.',
    },
    { key: "replyTo", label: "Reply-To", type: "string", hint: "Comma-separated." },
    { key: "configurationSetName", label: "Configuration set", type: "string" },
    { key: "tags", label: "Default message tags", type: "json" },
  ],
  output: [
    { key: "results", type: "array", label: "Per-entry results, in input order" },
    { key: "successCount", type: "number", label: "Entries accepted" },
    { key: "failureCount", type: "number", label: "Entries not accepted" },
  ],

  async execute(input, ctx) {
    const entries = toJson<Entry[]>(input.entries, "Entries");
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error("Entries must be a non-empty array.");
    }
    if (entries.length > 50) throw new Error("SES accepts at most 50 entries per bulk send.");

    const res = await ses<{ BulkEmailEntryResults?: Array<Record<string, string>> }>(ctx, {
      op: "SendBulkEmail",
      method: "POST",
      path: "/v2/email/outbound-bulk-emails",
      body: {
        FromEmailAddress: input.from,
        ReplyToAddresses: toList(input.replyTo),
        DefaultContent: {
          Template: {
            TemplateName: input.templateName,
            TemplateData: templateData(input.defaultTemplateData) ?? "{}",
          },
        },
        BulkEmailEntries: entries.map((e) => ({
          Destination: {
            ToAddresses: toList(e.to),
            CcAddresses: toList(e.cc),
            BccAddresses: toList(e.bcc),
          },
          ...(e.templateData !== undefined
            ? {
              ReplacementEmailContent: {
                ReplacementTemplate: { ReplacementTemplateData: templateData(e.templateData) },
              },
            }
            : {}),
        })),
        ConfigurationSetName: input.configurationSetName || undefined,
        DefaultEmailTags: toTags(input.tags),
      },
    });

    const results = camelKeys<Output["results"]>(res.BulkEmailEntryResults ?? []);
    const successCount = results.filter((r) => r.status === "SUCCESS").length;
    return { results, successCount, failureCount: results.length - successCount };
  },
};

export default action;
