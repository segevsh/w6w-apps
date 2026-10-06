import type { ActionDefinition } from "@w6w/types";
import { call, encodeId } from "../lib/client.ts";
import { blogId, str } from "../lib/params.ts";
import { postBody, postFields, type PostInput, postOutput } from "../lib/posts.ts";

type Input = PostInput & { blogId: string; id: string };

/** `PUT /v2/scheduler/posts/{id}` — replaces the post with the body sent. */
const postUpdate: ActionDefinition<Input> = {
  key: "post-update",
  type: "perform",
  resource: "post",
  title: "Update Scheduled Post",
  description:
    "Replace a scheduled post (PUT): fields you omit are not carried over, so send the " +
    "whole post. To only move the publication date use Reschedule Post.",
  idempotent: true,
  params: [blogId, str("id", "Post ID", { required: true }), ...postFields],
  output: [...postOutput],

  async execute(input, ctx) {
    const path = `/v2/scheduler/posts/${encodeId(input.id)}`;
    return (await call(ctx, "PUT", path, {
      blogId: input.blogId,
      body: postBody(input),
    })) as Record<
      string,
      unknown
    >;
  },
};

export default postUpdate;
