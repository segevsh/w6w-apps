import type { ActionDefinition } from "@w6w/types";
import { listResult, MightyClient, seg } from "../lib/client.ts";

/** `GET /posts/{post_id}/comments` under `/admin/v1/networks/{network_id}` — the Network comes from the Connection. */
interface Input {
  postId: number;
  page?: number;
  perPage?: number;
}

const commentList: ActionDefinition<Input> = {
  key: "comment-list",
  type: "search",
  resource: "comment",
  title: "List Comments",
  description: "List the comments on a post, one page at a time.",
  params: [
    {
      key: "postId",
      label: "Post ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1-based. Defaults to 1.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      hint: "Items per page, max 100.",
      validation: { integer: true, min: 1, max: 100 },
    },
  ],
  output: [
    {
      key: "items",
      type: "array",
      label:
        "The page of records, when the response carries them as an array under `items`/`data` (null otherwise)",
    },
    { key: "result", type: "object", label: "The full response body, unmodified" },
  ],

  async execute(input, ctx) {
    return listResult(
      await new MightyClient(ctx).request(`/posts/${seg(input.postId)}/comments`, {
        query: { page: input.page, per_page: input.perPage },
      }),
    );
  },
};

export default commentList;
