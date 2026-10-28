import type { ActionDefinition } from "@w6w/types";
import { FacebookClient } from "../lib/client.ts";

interface Input {
  postId: string;
  fields?: string;
}

interface PostDetail {
  id: string;
  message?: string;
  created_time?: string;
  permalink_url?: string;
  from?: { id?: string; name?: string };
  full_picture?: string;
}

/**
 * Fetch a single post by id — `GET /{post-id}`.
 */
const getPost: ActionDefinition<Input, PostDetail> = {
  key: "get-post",
  type: "read",
  resource: "post",
  title: "Get Post",
  description: "Fetch a post's fields by id.",
  params: [
    { key: "postId", label: "Post ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: "id,message,created_time,permalink_url,from,full_picture",
      hint: "Comma-separated Graph API field list.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Post ID" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    const client = new FacebookClient(ctx);
    return client.request<PostDetail>(`/${input.postId}`, {
      params: {
        fields: input.fields || "id,message,created_time,permalink_url,from,full_picture",
      },
    });
  },
};

export default getPost;
