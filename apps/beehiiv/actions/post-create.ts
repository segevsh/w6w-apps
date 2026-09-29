import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, BeehiivClient, compact, toList } from "../lib/client.ts";
import { publicationIdParam } from "../lib/params.ts";

interface Input {
  publicationId: string;
  title: string;
  subtitle?: string;
  bodyContent?: string;
  blocks?: unknown;
  postTemplateId?: string;
  status?: "draft" | "confirmed";
  scheduledAt?: string;
  customLinkTrackingEnabled?: boolean;
  thumbnailImageUrl?: string;
  contentTags?: string;
  newsletterListId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  emailSettings?: unknown;
  webSettings?: unknown;
  seoSettings?: unknown;
  recipients?: unknown;
  customFields?: unknown;
}

/**
 * `POST /publications/{publicationId}/posts` — beehiiv's Send API.
 *
 * Available on the Max and Enterprise plans only (the vendor's own note). The
 * post is created **asynchronously**: this returns `201` with a stable `id`
 * immediately, but the post may not be readable yet — poll `post-get` and
 * check its `processing` output.
 *
 * Provide exactly one of `bodyContent` (raw HTML, sanitized — `<style>`/
 * `<link>` tags are stripped, so use inline styles) or `blocks` (beehiiv's
 * structured content-block JSON). Providing both is rejected by the API.
 */
const postCreate: ActionDefinition<Input> = {
  key: "post-create",
  type: "perform",
  resource: "post",
  title: "Create Post",
  description:
    "Create a post (Max/Enterprise plans only). Creation is asynchronous — the returned id is " +
    "stable, but use Get Post to confirm it finished building before reading its content.",
  idempotent: false,
  params: [
    publicationIdParam,
    { key: "title", label: "Title", type: "string", required: true },
    { key: "subtitle", label: "Subtitle", type: "string" },
    {
      key: "bodyContent",
      label: "Body (raw HTML)",
      type: "text",
      hint: "Sanitized on save: <style> and <link> tags are stripped — use inline styles. " +
        "Provide this OR `blocks`, not both.",
    },
    {
      key: "blocks",
      label: "Blocks (structured content JSON)",
      type: "json",
      hint: "beehiiv's block-array content format (paragraph, image, heading, button, html, " +
        "table, list, columns, ...). Provide this OR `bodyContent`, not both.",
    },
    {
      key: "postTemplateId",
      label: "Post template ID",
      type: "string",
      hint: "Defaults to the publication's default template when omitted.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "draft", label: "Draft (default) — not scheduled or published" },
        { value: "confirmed", label: "Confirmed — publishes immediately or at Scheduled at" },
      ],
    },
    {
      key: "scheduledAt",
      label: "Scheduled at",
      type: "datetime",
      hint: "ISO 8601. A draft post cannot be scheduled — set Status to confirmed too.",
    },
    { key: "customLinkTrackingEnabled", label: "Custom link tracking", type: "boolean" },
    { key: "thumbnailImageUrl", label: "Thumbnail image URL", type: "string" },
    { key: "contentTags", label: "Content tags", type: "string", hint: "Comma-separated." },
    {
      key: "newsletterListId",
      label: "Newsletter list ID",
      type: "string",
      hint: "Restricts sending to this list's subscribers only.",
    },
    { key: "utmSource", label: "UTM source", type: "string" },
    { key: "utmMedium", label: "UTM medium", type: "string" },
    { key: "utmCampaign", label: "UTM campaign", type: "string" },
    {
      key: "emailSettings",
      label: "Email settings (JSON)",
      type: "json",
      hint: 'e.g. {"email_subject_line": "...", "email_preview_text": "..."}.',
    },
    { key: "webSettings", label: "Web settings (JSON)", type: "json" },
    { key: "seoSettings", label: "SEO settings (JSON)", type: "json" },
    {
      key: "recipients",
      label: "Recipients (JSON)",
      type: "json",
      hint: 'e.g. {"email": {"include_segment_ids": ["seg_..."]}}.',
    },
    {
      key: "customFields",
      label: "Custom fields (JSON object)",
      type: "json",
      hint: 'Flat {"Field Name": "value"} map. Fields must already exist on the publication.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Post ID — stable even while still building" },
    { key: "preview_url", type: "string", label: "Preview URL" },
  ],

  async execute(input, ctx) {
    if (input.bodyContent && input.blocks) {
      throw new Error("Provide bodyContent OR blocks, not both — beehiiv rejects both together.");
    }
    return await new BeehiivClient(ctx).data(
      `/publications/${encodeURIComponent(input.publicationId)}/posts`,
      {
        method: "POST",
        body: compact({
          title: input.title,
          subtitle: input.subtitle,
          body_content: input.bodyContent,
          blocks: asOptionalJson(input.blocks, "blocks"),
          post_template_id: input.postTemplateId,
          status: input.status,
          scheduled_at: input.scheduledAt,
          custom_link_tracking_enabled: input.customLinkTrackingEnabled,
          thumbnail_image_url: input.thumbnailImageUrl,
          content_tags: toList(input.contentTags),
          newsletter_list_id: input.newsletterListId,
          utm_source: input.utmSource,
          utm_medium: input.utmMedium,
          utm_campaign: input.utmCampaign,
          email_settings: asOptionalJson(input.emailSettings, "emailSettings"),
          web_settings: asOptionalJson(input.webSettings, "webSettings"),
          seo_settings: asOptionalJson(input.seoSettings, "seoSettings"),
          recipients: asOptionalJson(input.recipients, "recipients"),
          custom_fields: asOptionalJson(input.customFields, "customFields"),
        }),
      },
    );
  },
};

export default postCreate;
