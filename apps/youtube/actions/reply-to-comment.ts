import type { ActionDefinition } from "@w6w/types";
import { YouTubeClient } from "../lib/client.ts";

interface Input {
  parentId: string;
  textOriginal: string;
}

/**
 * `comments.insert` — POST /youtube/v3/comments
 * https://developers.google.com/youtube/v3/docs/comments/insert
 *
 * **Quota: 50 units.** Requires `youtube.force-ssl`; no other scope can write
 * comments.
 *
 * **This method only creates *replies*.** `snippet.parentId` is required, and it
 * must name an existing top-level comment — the id of a thread's
 * `snippet.topLevelComment.id` from `list-comment-threads`. Creating a *new*
 * top-level comment is a different endpoint (`commentThreads.insert`), which
 * this app does not implement, so the action is named for what it does.
 *
 * `part` is fixed at `snippet` here rather than exposed. Google's own reference
 * says so in as many words — *"Set the parameter value to snippet"* — and
 * `comments` has only one other part, `id`, which would return a reply with no
 * text. There is no meaningful choice to offer, and offering one would only
 * create a way to get a useless response.
 *
 * Each call posts a new reply, so a retry double-posts: `idempotent: false`.
 */
const replyToComment: ActionDefinition<Input> = {
  key: "reply-to-comment",
  type: "perform",
  resource: "comment",
  title: "Reply To Comment",
  description:
    "Post a reply to an existing top-level comment. Costs 50 quota units. Requires the youtube.force-ssl scope. This creates replies only — new top-level comments use a different endpoint that this app does not implement.",
  idempotent: false,
  params: [
    {
      key: "parentId",
      label: "Parent comment ID",
      type: "string",
      required: true,
      hint:
        "The top-level comment being replied to — `items[].snippet.topLevelComment.id` from List Comment Threads. Not the thread ID's video, and not another reply.",
    },
    {
      key: "textOriginal",
      label: "Reply text",
      type: "text",
      required: true,
      hint: "Plain text. YouTube renders links itself; HTML is not accepted.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "snippet", type: "object", label: "Snippet" },
    { key: "kind", type: "string", label: "Resource kind" },
  ],

  execute(input, ctx) {
    const client = new YouTubeClient(ctx);
    return client.request("/comments", {
      method: "POST",
      // Fixed by the API's own instruction, not a defaulted choice.
      part: "snippet",
      body: {
        snippet: {
          parentId: input.parentId,
          textOriginal: input.textOriginal,
        },
      },
    });
  },
};

export default replyToComment;
