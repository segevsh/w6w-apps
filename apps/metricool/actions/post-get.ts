import type { ActionDefinition } from "@w6w/types";
import { call, encodeId } from "../lib/client.ts";
import { blogId, str } from "../lib/params.ts";
import { postOutput } from "../lib/posts.ts";

type Input = { blogId: string; id: string };

/** `GET /v2/scheduler/posts/{id}`. */
const postGet: ActionDefinition<Input> = {
  key: "post-get",
  type: "read",
  resource: "post",
  title: "Get Scheduled Post",
  description: "Get one scheduled post by id, with its per-network publishing status.",
  params: [blogId, str("id", "Post ID", { required: true })],
  output: [...postOutput],

  async execute(input, ctx) {
    const path = `/v2/scheduler/posts/${encodeId(input.id)}`;
    return (await call(ctx, "GET", path, { blogId: input.blogId })) as Record<string, unknown>;
  },
};

export default postGet;
