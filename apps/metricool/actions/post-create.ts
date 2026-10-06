import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";
import { blogId } from "../lib/params.ts";
import { postBody, postFields, type PostInput, postOutput } from "../lib/posts.ts";

type Input = PostInput & { blogId: string };

/** `POST /v2/scheduler/posts`. */
const postCreate: ActionDefinition<Input> = {
  key: "post-create",
  type: "perform",
  resource: "post",
  title: "Create Scheduled Post",
  description: "Schedule a post to one or more of a brand's networks.",
  // No idempotency key is accepted: a retry would schedule a second post.
  idempotent: false,
  params: [blogId, ...postFields],
  output: [...postOutput],

  async execute(input, ctx) {
    return (await call(ctx, "POST", "/v2/scheduler/posts", {
      blogId: input.blogId,
      body: postBody(input),
    })) as Record<string, unknown>;
  },
};

export default postCreate;
