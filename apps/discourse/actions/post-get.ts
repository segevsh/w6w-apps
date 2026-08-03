import type { ActionDefinition } from "@w6w/types";
import { DiscourseClient } from "../lib/client.ts";
import { postOutput } from "../lib/params.ts";

/**
 * `GET /posts/{id}.json` — one post by its global id.
 *
 * The response is the post itself, unenveloped, unlike the `PUT` on the same
 * path which wraps it in `{ "post": … }`. That asymmetry is Discourse's, not a
 * transcription slip; `post-update` unwraps and this does not.
 */
interface Input {
  postId: number | string;
}

const postGet: ActionDefinition<Input> = {
  key: "post-get",
  type: "read",
  resource: "post",
  title: "Get Post",
  description: "Fetch a single post by id.",
  params: [
    {
      key: "postId",
      label: "Post ID",
      type: "number",
      required: true,
      hint: "The global post id, not its position within a topic.",
      validation: { integer: true },
    },
  ],
  output: postOutput,

  execute(input, ctx) {
    return new DiscourseClient(ctx).request(
      `/posts/${encodeURIComponent(String(input.postId))}.json`,
    );
  },
};

export default postGet;
