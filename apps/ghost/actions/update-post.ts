import type { ActionDefinition } from "@w6w/types";
import { GhostClient } from "../lib/client.ts";

interface Input {
  postId: string;
  updatedAt: string;
  title?: string;
  html?: string;
  status?: string;
  publishedAt?: string;
  tags?: string[];
  featureImage?: string;
  excerpt?: string;
  visibility?: string;
}

interface PostBody {
  updated_at: string;
  title?: string;
  html?: string;
  status?: string;
  published_at?: string;
  tags?: { name: string }[];
  feature_image?: string;
  custom_excerpt?: string;
  visibility?: string;
}

const updatePost: ActionDefinition<Input> = {
  key: "update-post",
  type: "perform",
  resource: "post",
  title: "Update Post",
  description: "Update an existing post.",
  idempotent: true,
  params: [
    { key: "postId", label: "Post ID", type: "string", required: true },
    {
      key: "updatedAt",
      label: "Updated At",
      type: "datetime",
      required: true,
      hint: "Ghost's collision guard: must match the post's current `updatedAt` (from Get Post) " +
        "or the update is rejected as a conflict.",
    },
    { key: "title", label: "Title", type: "string" },
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
    },
    { key: "publishedAt", label: "Published At", type: "datetime" },
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
    },
  ],
  output: [{ key: "id", type: "string", label: "Post ID" }],

  execute(input, ctx) {
    const client = GhostClient.fromConnection(ctx);
    const body: PostBody = { updated_at: input.updatedAt };
    if (input.title !== undefined) body.title = input.title;
    if (input.html !== undefined) body.html = input.html;
    if (input.status !== undefined) body.status = input.status;
    if (input.publishedAt !== undefined) body.published_at = input.publishedAt;
    if (input.tags !== undefined) body.tags = input.tags.map((name) => ({ name }));
    if (input.featureImage !== undefined) body.feature_image = input.featureImage;
    if (input.excerpt !== undefined) body.custom_excerpt = input.excerpt;
    if (input.visibility !== undefined) body.visibility = input.visibility;
    return client.update(
      "posts",
      input.postId,
      body,
      input.html !== undefined ? { source: "html" } : undefined,
    );
  },
};

export default updatePost;
