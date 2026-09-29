import type { ActionDefinition } from "@w6w/types";
import { BeehiivClient, compact, toList } from "../lib/client.ts";
import {
  bracketQuery,
  directionParam,
  offsetPaginationParams,
  publicationIdParam,
} from "../lib/params.ts";

interface Input {
  publicationId: string;
  expand?: string;
  audience?: "free" | "premium" | "all";
  platform?: "web" | "email" | "both" | "all";
  status?: "draft" | "confirmed" | "archived" | "all";
  contentTags?: string;
  slugs?: string;
  authors?: string;
  premiumTiers?: string;
  limit?: number;
  page?: number;
  orderBy?: "created" | "publish_date" | "displayed_date";
  direction?: "asc" | "desc";
  hiddenFromFeed?: "all" | "true" | "false";
}

/** `GET /publications/{publicationId}/posts` — every post in a publication. */
const postList: ActionDefinition<Input> = {
  key: "post-list",
  type: "read",
  resource: "post",
  title: "List Posts",
  description: "Retrieve all posts belonging to a specific publication.",
  params: [
    publicationIdParam,
    {
      key: "expand",
      label: "Expand",
      type: "string",
      hint: "Comma-separated: `stats`, `free_web_content`, `free_email_content`, " +
        "`free_rss_content`, `premium_web_content`, `premium_email_content`, `recipients`.",
    },
    {
      key: "audience",
      label: "Audience",
      type: "select",
      options: [
        { value: "free", label: "Free" },
        { value: "premium", label: "Premium" },
        { value: "all", label: "All" },
      ],
    },
    {
      key: "platform",
      label: "Platform",
      type: "select",
      options: [
        { value: "web", label: "Web only" },
        { value: "email", label: "Email only" },
        { value: "both", label: "Published to both" },
        { value: "all", label: "All (default)" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "draft", label: "Draft" },
        { value: "confirmed", label: "Confirmed" },
        { value: "archived", label: "Archived" },
        { value: "all", label: "All (default)" },
      ],
    },
    {
      key: "contentTags",
      label: "Content tags",
      type: "string",
      hint: "Comma-separated. Matches a post with ANY of the listed tags.",
    },
    {
      key: "slugs",
      label: "Slugs",
      type: "string",
      hint: "Comma-separated. Matches a post with ANY of the listed slugs.",
    },
    {
      key: "authors",
      label: "Authors",
      type: "string",
      hint: "Comma-separated author names (case-insensitive). Matches ANY.",
    },
    {
      key: "premiumTiers",
      label: "Premium tiers",
      type: "string",
      hint: "Comma-separated premium tier display names (case-insensitive).",
    },
    ...offsetPaginationParams(),
    {
      key: "orderBy",
      label: "Order by",
      type: "select",
      options: [
        { value: "created", label: "Created (default)" },
        { value: "publish_date", label: "Publish date" },
        { value: "displayed_date", label: "Displayed date" },
      ],
    },
    directionParam,
    {
      key: "hiddenFromFeed",
      label: "Hidden from feed",
      type: "select",
      options: [
        { value: "all", label: "All (default)" },
        { value: "true", label: "Hidden only" },
        { value: "false", label: "Visible only" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Post ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "publish_date", type: "number", label: "Publish date (Unix seconds)" },
    { key: "web_url", type: "string", label: "Web URL" },
  ],

  async execute(input, ctx) {
    return await new BeehiivClient(ctx).list(
      `/publications/${encodeURIComponent(input.publicationId)}/posts`,
      {
        query: {
          ...compact({
            expand: input.expand,
            audience: input.audience,
            platform: input.platform,
            status: input.status,
            premium_tiers: input.premiumTiers,
            limit: input.limit,
            page: input.page,
            order_by: input.orderBy,
            direction: input.direction,
            hidden_from_feed: input.hiddenFromFeed,
          }),
          ...bracketQuery("content_tags", toList(input.contentTags)),
          ...bracketQuery("slugs", toList(input.slugs)),
          ...bracketQuery("authors", toList(input.authors)),
        },
      },
    );
  },
};

export default postList;
