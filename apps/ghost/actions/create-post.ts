import type { ActionDefinition } from "@w6w/types";
import { GhostClient } from "../lib/client.ts";

interface Input {
  title: string;
  html?: string;
  status?: string;
  publishedAt?: string;
  tags?: string[];
  featureImage?: string;
  excerpt?: string;
  visibility?: string;
}

interface PostBody {
  title: string;
  html?: string;
  status?: string;
  published_at?: string;
  tags?: { name: string }[];
  feature_image?: string;
  custom_excerpt?: string;
  visibility?: string;
}

const createPost: ActionDefinition<Input> = {
  key: "create-post",
  type: "perform",
  resource: "post",
  title: "Create Post",
  description: "Create a new post. HTML content is converted to Ghost's Lexical format on save.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "html",
      label: "Content (HTML)",
      type: "text",
      hint: "Sent with `?source=html`; Ghost converts it to Lexical (best-effort, may be lossy).",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "draft", label: "Draft" },
        { value: "published", label: "Published" },
        { value: "scheduled", label: "Scheduled" },
      ],
      default: "draft",
    },
    {
      key: "publishedAt",
      label: "Published At",
      type: "datetime",
      hint: "Required (future date) when Status is Scheduled.",
    },
    { key: "tags", label: "Tag Names", type: "multiselect" },
    { key: "featureImage", label: "Feature Image URL", type: "string" },
    { key: "excerpt", label: "Custom Excerpt", type: "text", hint: "Max 300 characters." },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      options: [
        { value: "public", label: "Public" },
        { value: "members", label: "Members Only" },
        { value: "paid", label: "Paid Members Only" },
      ],
      default: "public",
    },
  ],
  output: [{ key: "id", type: "string", label: "Post ID" }],

  execute(input, ctx) {
    const client = GhostClient.fromConnection(ctx);
    const body: PostBody = { title: input.title };
    if (input.html !== undefined) body.html = input.html;
    if (input.status !== undefined) body.status = input.status;
    if (input.publishedAt !== undefined) body.published_at = input.publishedAt;
    if (input.tags !== undefined) body.tags = input.tags.map((name) => ({ name }));
    if (input.featureImage !== undefined) body.feature_image = input.featureImage;
    if (input.excerpt !== undefined) body.custom_excerpt = input.excerpt;
    if (input.visibility !== undefined) body.visibility = input.visibility;
    return client.create("posts", body, input.html !== undefined ? { source: "html" } : undefined);
  },
};

export default createPost;
