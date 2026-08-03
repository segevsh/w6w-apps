import type { ActionDefinition } from "@w6w/types";
import { KitClient } from "../lib/client.ts";

interface SubscriberFilterGroup {
  all?: Array<{ type: "segment" | "tag"; ids: number[] }>;
  any?: Array<{ type: "segment" | "tag"; ids: number[] }>;
  none?: Array<{ type: "segment" | "tag"; ids: number[] }>;
}

interface Input {
  subject: string;
  content: string;
  description?: string;
  previewText?: string;
  sendAt?: string;
  public?: boolean;
  publishedAt?: string;
  emailAddress?: string;
  emailTemplateId?: number;
  thumbnailUrl?: string;
  thumbnailAlt?: string;
  subscriberFilter?: SubscriberFilterGroup[];
}

/**
 * `idempotent: false` — every call creates a new broadcast; Kit offers no
 * dedupe key on this endpoint, so a blind retry produces a second draft.
 *
 * On required fields: Kit's OpenAPI marks seven properties `required`
 * (`content`, `description`, `public`, `published_at`, `preview_text`,
 * `subject`, `subscriber_filter`), but the endpoint's own prose says a
 * scheduled broadcast "should contain a subject and your content, at a
 * minimum" and that a draft is made by sending `send_at: null`. We require
 * only the documented minimum and forward the rest when supplied, rather than
 * forcing a caller to invent a `published_at` for a draft.
 */
const createBroadcast: ActionDefinition<Input> = {
  key: "create-broadcast",
  type: "perform",
  resource: "broadcast",
  title: "Create Broadcast",
  description:
    "Draft or schedule a broadcast. Omit `sendAt` to save a draft; supply an ISO 8601 `sendAt` to schedule it. Targeting is optional and defaults to every subscriber.",
  idempotent: false,
  params: [
    { key: "subject", label: "Subject", type: "string", required: true },
    {
      key: "content",
      label: "Content",
      type: "code",
      required: true,
      hint: "The HTML body of the email.",
    },
    {
      key: "description",
      label: "Description",
      type: "string",
      hint: "Internal label shown in Kit, not sent to subscribers.",
    },
    { key: "previewText", label: "Preview text", type: "string" },
    {
      key: "sendAt",
      label: "Send at",
      type: "datetime",
      hint: "ISO 8601. UTC is assumed when no timezone is given. Omit to save as a draft.",
    },
    {
      key: "public",
      label: "Publish to the web",
      type: "boolean",
      hint: "Adds the broadcast to the newsletter feed on your Creator Profile and landing pages.",
    },
    {
      key: "publishedAt",
      label: "Published at",
      type: "datetime",
      hint: "ISO 8601 timestamp displayed on the public post.",
    },
    {
      key: "emailAddress",
      label: "Sending email address",
      type: "string",
      hint: "Defaults to the account's sending address.",
    },
    {
      key: "emailTemplateId",
      label: "Email template ID",
      type: "number",
      hint:
        "Defaults to the account's default template. Kit's 'Starting point' template is not supported.",
    },
    { key: "thumbnailUrl", label: "Thumbnail URL", type: "string" },
    { key: "thumbnailAlt", label: "Thumbnail alt text", type: "string" },
    {
      key: "subscriberFilter",
      label: "Subscriber filter",
      type: "json",
      hint:
        'JSON array of one filter group. Kit accepts only one group type per request — `all`, `any`, or `none`, not a combination. e.g. `[{"any": [{"type": "tag", "ids": [12]}]}]`. Omit to target all subscribers.',
    },
  ],
  output: [{ key: "broadcast", type: "object", label: "Broadcast" }],

  execute(input, ctx) {
    const body: Record<string, unknown> = {
      subject: input.subject,
      content: input.content,
    };
    if (input.description !== undefined) body.description = input.description;
    if (input.previewText !== undefined) body.preview_text = input.previewText;
    // Explicit null is how Kit is told "save this as a draft".
    body.send_at = input.sendAt ?? null;
    if (input.public !== undefined) body.public = input.public;
    if (input.publishedAt !== undefined) body.published_at = input.publishedAt;
    if (input.emailAddress !== undefined) body.email_address = input.emailAddress;
    if (input.emailTemplateId !== undefined) body.email_template_id = input.emailTemplateId;
    if (input.thumbnailUrl !== undefined) body.thumbnail_url = input.thumbnailUrl;
    if (input.thumbnailAlt !== undefined) body.thumbnail_alt = input.thumbnailAlt;
    if (input.subscriberFilter !== undefined) body.subscriber_filter = input.subscriberFilter;

    return new KitClient(ctx).request("/broadcasts", { method: "POST", body });
  },
};

export default createBroadcast;
