import type { ActionDefinition } from "@w6w/types";
import { compact, MightyClient } from "../lib/client.ts";

/** `POST /posts` under `/admin/v1/networks/{network_id}` — the Network comes from the Connection. */
interface Input {
  spaceId: number;
  title: string;
  description?: string;
  postType?: string;
  notify?: boolean;
}

const postCreate: ActionDefinition<Input> = {
  key: "post-create",
  type: "perform",
  resource: "post",
  title: "Create Post",
  description: "Publish a post (or article) in a space, optionally notifying the Network.",
  idempotent: false,
  params: [
    {
      key: "spaceId",
      label: "Space ID",
      type: "number",
      required: true,
      hint: "The space to post in.",
      validation: { integer: true, min: 1 },
    },
    { key: "title", label: "Title", type: "string", required: true },
    { key: "description", label: "Body", type: "text", hint: "The post body." },
    { key: "postType", label: "Post type", type: "string", hint: "E.g. 'article'." },
    {
      key: "notify",
      label: "Notify the Network",
      type: "boolean",
      hint: "Send notifications for this post.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Post id" },
    { key: "title", type: "string", label: "Title" },
    { key: "description", type: "string", label: "Body" },
    { key: "summary", type: "string", label: "Short summary" },
    { key: "post_type", type: "string", label: "Post type" },
    { key: "space_id", type: "number", label: "Space id" },
    { key: "creator_id", type: "number", label: "Author user id" },
    { key: "status", type: "string", label: "Status" },
    { key: "published_at", type: "string", label: "Published (ISO 8601)" },
    { key: "comments_enabled", type: "boolean", label: "Comments enabled" },
    { key: "permalink", type: "string", label: "Post URL" },
    { key: "created_at", type: "string", label: "Created (ISO 8601)" },
    { key: "updated_at", type: "string", label: "Updated (ISO 8601)" },
  ],

  execute(input, ctx) {
    return new MightyClient(ctx).request("/posts", {
      method: "POST",
      query: { notify: input.notify },
      body: compact({
        space_id: input.spaceId,
        title: input.title,
        description: input.description,
        post_type: input.postType,
      }),
    });
  },
};

export default postCreate;
