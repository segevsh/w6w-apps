import type { ActionDefinition } from "@w6w/types";
import { RedditClient } from "../lib/client.ts";

interface Input {
  parentId: string;
  text: string;
}

interface Comment {
  id: string;
  name: string;
  body: string;
}

/**
 * `POST /api/comment` (scope: submit) —
 * github.com/reddit-archive/reddit/wiki/API#POST_api_comment, ported from
 * n8n's `Reddit.node.ts` (`postComment: create` / `postComment: reply` — the
 * same endpoint handles both; Reddit distinguishes a top-level comment from
 * a reply purely by whether `thing_id` is a post (`t3_`) or a comment
 * (`t1_`)).
 *
 * `parentId` therefore takes either fullname as-is, unlike this app's other
 * post-scoped actions which take a bare id and add a fixed prefix — a
 * comment can be a child of either a post or another comment, so there's no
 * single prefix to assume.
 */
const commentSubmit: ActionDefinition<Input, Comment> = {
  key: "comment-submit",
  type: "perform",
  resource: "comment",
  title: "Submit Comment",
  description: "Post a top-level comment on a post, or a reply to another comment.",
  idempotent: false,
  params: [
    {
      key: "parentId",
      label: "Parent fullname",
      type: "string",
      required: true,
      placeholder: "t3_l0me7x",
      hint:
        "A post fullname (t3_...) for a top-level comment, or a comment fullname (t1_...) for a reply.",
    },
    { key: "text", label: "Text", type: "text", required: true, hint: "Markdown supported." },
  ],
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "name", type: "string", label: "Fullname (t1_...)" },
    { key: "body", type: "string", label: "Body" },
  ],

  async execute(input, ctx) {
    const res = await new RedditClient(ctx).request<
      { json: { data: { things: [{ data: Comment }] } } }
    >(
      "/api/comment",
      {
        method: "POST",
        form: { api_type: "json", thing_id: input.parentId, text: input.text },
      },
    );
    return res.json.data.things[0].data;
  },
};

export default commentSubmit;
