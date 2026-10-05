import type { ActionDefinition } from "@w6w/types";
import { MightyClient, seg } from "../lib/client.ts";

/** `GET /posts/{id}/` under `/admin/v1/networks/{network_id}` — the Network comes from the Connection. */
interface Input {
  id: number;
}

const postGet: ActionDefinition<Input> = {
  key: "post-get",
  type: "read",
  resource: "post",
  title: "Get Post",
  description: "Fetch one post or article by id.",
  params: [
    {
      key: "id",
      label: "Post ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
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
    return new MightyClient(ctx).request(`/posts/${seg(input.id)}/`);
  },
};

export default postGet;
