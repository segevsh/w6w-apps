import type { ActionDefinition } from "@w6w/types";
import { CircleClient } from "../lib/client.ts";
import { postOutput } from "../lib/params.ts";

/**
 * `GET /posts/{id}` — one basic post.
 *
 * The response carries the body **twice**, in two different shapes, and which
 * one a workflow wants depends entirely on what it does next:
 *
 *   - `tiptap_body` — the structured TipTap document. Round-trip this into
 *     `post-update`'s JSON body param to edit a post without flattening its
 *     formatting.
 *   - `body` — Circle's rendered form, for anything that just needs to read the
 *     text.
 *
 * Both are declared on the output so the editor offers them, and neither is
 * unwrapped or normalised here: rewriting a vendor's document format on the way
 * through is how a round trip stops being one.
 */
interface Input {
  postId: number;
}

const postGet: ActionDefinition<Input> = {
  key: "post-get",
  type: "read",
  resource: "post",
  title: "Get Post",
  description: "Fetch one basic post, including both its TipTap document and its rendered body.",
  params: [
    {
      key: "postId",
      label: "Post ID",
      type: "number",
      required: true,
      hint: "Numeric id. `post-list` returns them.",
      validation: { integer: true },
    },
  ],
  output: postOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request(`/posts/${encodeURIComponent(String(input.postId))}`);
  },
};

export default postGet;
