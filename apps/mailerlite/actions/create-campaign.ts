import type { ActionDefinition } from "@w6w/types";
import { MailerLiteClient, type MailerLiteEnvelope } from "../lib/client.ts";

interface Input {
  name: string;
  type?: "regular" | "ab" | "resend" | "multivariate";
  subject?: string;
  fromName?: string;
  from?: string;
  replyTo?: string;
  content?: string;
  groups?: string[];
  segments?: string[];
  languageId?: number;
  emails?: Array<Record<string, unknown>>;
}

/**
 * `POST /api/campaigns` — creates a DRAFT. Nothing is sent until
 * `schedule-campaign` runs against the returned id.
 *
 * The wire shape nests the message under an `emails` array (one item for a
 * regular campaign, several only for a multivariate content test). Rather than
 * make every caller hand-build that array, the four fields a regular campaign
 * actually needs are lifted to top-level params and assembled here. The raw
 * `emails` param is still available and wins when supplied, so A/B and
 * multivariate campaigns — whose `emails` shape is genuinely more involved —
 * remain reachable without this app pretending to model every variant.
 *
 * `from` must be an address already VERIFIED on the MailerLite account, and
 * `content` requires the Advanced plan; both are vendor-side constraints this
 * app cannot check for you.
 */
const createCampaign: ActionDefinition<Input> = {
  key: "create-campaign",
  type: "perform",
  resource: "campaign",
  title: "Create Campaign",
  description: "Create a draft campaign. Send it with Schedule Campaign.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      validation: { maxLength: 255 },
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      default: "regular",
      hint: "`resend` and `multivariate` need a Growing or Advanced plan.",
      options: [
        { value: "regular", label: "Regular" },
        { value: "ab", label: "A/B test" },
        { value: "resend", label: "Auto resend" },
        { value: "multivariate", label: "Multivariate" },
      ],
    },
    {
      key: "subject",
      label: "Subject",
      type: "string",
      validation: { maxLength: 255 },
      hint: "Required for a regular campaign. Ignored when `emails` is supplied.",
    },
    { key: "fromName", label: "From name", type: "string", validation: { maxLength: 255 } },
    {
      key: "from",
      label: "From address",
      type: "string",
      hint: "Must already be verified on the MailerLite account.",
    },
    {
      key: "replyTo",
      label: "Reply-to address",
      type: "string",
      hint: "Must also be verified on the account.",
    },
    {
      key: "content",
      label: "HTML content",
      type: "code",
      hint:
        "Valid HTML; Advanced plan only. Must carry an unsubscribe link, account name, address and country, or MailerLite appends its default footer.",
    },
    { key: "groups", label: "Group IDs", type: "json", hint: "JSON array of group ids." },
    {
      key: "segments",
      label: "Segment IDs",
      type: "json",
      hint:
        "JSON array of segment ids. When both are given, MailerLite uses segments and ignores groups.",
    },
    {
      key: "languageId",
      label: "Language ID",
      type: "number",
      hint: "Drives the unsubscribe template's language. Defaults to English.",
    },
    {
      key: "emails",
      label: "Emails (raw)",
      type: "json",
      hint:
        "Escape hatch: the raw `emails` array. Overrides subject / from name / from / reply-to / content.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Campaign" }],

  execute(input, ctx) {
    const client = new MailerLiteClient(ctx);

    let emails = input.emails;
    if (!emails) {
      const email: Record<string, unknown> = {};
      if (input.subject !== undefined) email.subject = input.subject;
      if (input.fromName !== undefined) email.from_name = input.fromName;
      if (input.from !== undefined) email.from = input.from;
      if (input.replyTo !== undefined) email.reply_to = input.replyTo;
      if (input.content !== undefined) email.content = input.content;
      emails = [email];
    }

    const body: Record<string, unknown> = {
      name: input.name,
      type: input.type ?? "regular",
      emails,
    };
    if (input.groups) body.groups = input.groups;
    if (input.segments) body.segments = input.segments;
    if (input.languageId !== undefined) body.language_id = input.languageId;

    return client.request<MailerLiteEnvelope>("/campaigns", { method: "POST", body });
  },
};

export default createCampaign;
