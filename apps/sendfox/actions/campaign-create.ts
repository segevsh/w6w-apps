import type { ActionDefinition } from "@w6w/types";
import { compact, SendfoxClient, toIdList } from "../lib/client.ts";

/**
 * `POST /campaigns` — create a campaign.
 *
 * ## It creates a DRAFT
 *
 * "Creates a campaign as a draft. To send it, use the send endpoint or provide
 * `scheduled_at`." The response is the bare `Campaign` with `sent_at: null`.
 *
 * ## Five required fields — the audience is not one of them
 *
 * The document's `required` list is `title`, `subject`, `html`, `from_name`,
 * `from_email`. Recipients **are** part of this body (`lists`,
 * `excluded_lists`, `to_contact_tags`, `excluded_contact_tags`) but are optional
 * here, because a draft can be created before its audience is chosen. The catch
 * is written into the description: "At least one list is required **if
 * `scheduled_at` is provided**" — so schedule-then-forget without a list is
 * rejected, and so is `campaign-send` on a listless draft (it answers `400`).
 *
 * ## Two content rules worth knowing before you hit them
 *
 *  - Subject lines **cannot start with `RE:` or `FWD:`** — a plain `422`, not a
 *    silent rewrite.
 *  - `preview_text` and `subject` are both capped at 191 characters; `html` at
 *    1,000,000.
 *
 * ## Not idempotent
 *
 * Every successful call creates a new draft, so a retry after a dropped
 * response would leave a second campaign behind.
 */
interface Input {
  title: string;
  subject: string;
  html: string;
  fromName: string;
  fromEmail: string;
  previewText?: string;
  scheduledAt?: string;
  lists?: number[];
  excludedLists?: number[];
  toContactTags?: number[];
  excludedContactTags?: number[];
}

const campaignCreate: ActionDefinition<Input> = {
  key: "campaign-create",
  type: "perform",
  resource: "campaign",
  title: "Create Campaign",
  description: "Create a campaign draft, optionally schedule it and choose its audience.",
  idempotent: false,
  params: [
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      hint: "Internal name (max 191 chars). Not the subject line.",
    },
    {
      key: "subject",
      label: "Subject",
      type: "string",
      required: true,
      hint: 'Max 191 chars. Cannot start with "RE:" or "FWD:" — SendFox rejects it.',
    },
    {
      key: "html",
      label: "HTML body",
      type: "text",
      required: true,
      hint: "The email's HTML content (max 1,000,000 chars).",
    },
    { key: "fromName", label: "From name", type: "string", required: true },
    {
      key: "fromEmail",
      label: "From email",
      type: "string",
      required: true,
      placeholder: "newsletter@example.com",
    },
    {
      key: "previewText",
      label: "Preview text",
      type: "string",
      hint: "Inbox preview snippet shown beneath the subject line (max 191 chars). Optional.",
    },
    {
      key: "scheduledAt",
      label: "Scheduled at",
      type: "datetime",
      hint: "Leave empty for a draft. Scheduling requires at least one list to be chosen.",
    },
    {
      key: "lists",
      label: "Send to lists",
      type: "array",
      item: { type: "number", placeholder: "42" },
      hint: "List ids whose contacts receive the campaign.",
    },
    {
      key: "excludedLists",
      label: "Exclude lists",
      type: "array",
      item: { type: "number", placeholder: "42" },
      hint: "List ids whose contacts are excluded. Exclusion wins over inclusion.",
    },
    {
      key: "toContactTags",
      label: "Send to tags",
      type: "array",
      item: { type: "number", placeholder: "7" },
      hint: "Tag ids whose contacts receive the campaign. Combines with Send to lists.",
    },
    {
      key: "excludedContactTags",
      label: "Exclude tags",
      type: "array",
      item: { type: "number", placeholder: "7" },
      hint: "Tag ids whose contacts are excluded. Exclusion wins over inclusion.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Campaign id" },
    { key: "title", type: "string", label: "Internal title" },
    { key: "subject", type: "string", label: "Subject line" },
    { key: "scheduled_at", type: "string", label: "Scheduled at (null for a draft)" },
    { key: "sent_at", type: "string", label: "Sent at (null until sent)" },
  ],

  execute(input, ctx) {
    return new SendfoxClient(ctx).json("/campaigns", {
      method: "POST",
      body: compact({
        title: input.title,
        subject: input.subject,
        html: input.html,
        from_name: input.fromName,
        from_email: input.fromEmail,
        preview_text: input.previewText,
        scheduled_at: input.scheduledAt,
        lists: toIdList(input.lists),
        excluded_lists: toIdList(input.excludedLists),
        to_contact_tags: toIdList(input.toContactTags),
        excluded_contact_tags: toIdList(input.excludedContactTags),
      }),
    });
  },
};

export default campaignCreate;
