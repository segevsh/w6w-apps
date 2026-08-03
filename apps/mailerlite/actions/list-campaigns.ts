import type { ActionDefinition } from "@w6w/types";
import { MailerLiteClient, type MailerLiteEnvelope } from "../lib/client.ts";

interface Input {
  status?: "sent" | "draft" | "ready";
  type?: "regular" | "ab" | "resend" | "rss";
  limit?: number;
  page?: number;
}

/**
 * `GET /api/campaigns` — page paginated. Careful with the default: MailerLite
 * defaults `filter[status]` to `ready`, NOT to "all". We send the filter only
 * when asked, so the vendor default applies unchanged rather than being
 * silently masked.
 */
const listCampaigns: ActionDefinition<Input> = {
  key: "list-campaigns",
  type: "read",
  resource: "campaign",
  title: "List Campaigns",
  description:
    "List campaigns. MailerLite defaults to status `ready` when no status filter is supplied.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      hint: "Omitted means MailerLite's own default: `ready`.",
      options: [
        { value: "sent", label: "Sent" },
        { value: "draft", label: "Draft" },
        { value: "ready", label: "Ready" },
      ],
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      hint: "Omitted returns every type.",
      options: [
        { value: "regular", label: "Regular" },
        { value: "ab", label: "A/B test" },
        { value: "resend", label: "Auto resend" },
        { value: "rss", label: "RSS" },
      ],
    },
    { key: "limit", label: "Limit", type: "number", default: 25 },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],
  output: [
    { key: "data", type: "array", label: "Campaigns" },
    { key: "links", type: "object", label: "Page links" },
    { key: "meta", type: "object", label: "Pagination meta" },
  ],

  execute(input, ctx) {
    const client = new MailerLiteClient(ctx);
    return client.request<MailerLiteEnvelope<unknown[]>>("/campaigns", {
      query: {
        "filter[status]": input.status,
        "filter[type]": input.type,
        limit: input.limit ?? 25,
        page: input.page ?? 1,
      },
    });
  },
};

export default listCampaigns;
