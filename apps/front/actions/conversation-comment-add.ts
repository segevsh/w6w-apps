import type { ActionDefinition } from "@w6w/types";
import { compact, FrontClient } from "../lib/client.ts";
import { CONVERSATION_PARAM } from "../lib/params.ts";

/**
 * `POST /conversations/{conversation_id}/comments` — verified against Front's
 * own OpenAPI document (`add-comment`).
 *
 * A comment is **internal**: it appears on the conversation for the team and
 * never reaches the customer. That makes it the right output for most
 * workflows — the CRM lookup, the risk score, the "this account is on the
 * enterprise plan" note — where a reply would be wrong because it would be sent.
 *
 * The difference matters enough to be worth stating plainly: getting these two
 * calls the wrong way round emails a customer your internal notes.
 *
 * `@mentions` work in the body using Front's own syntax, which is how a comment
 * can page a specific teammate rather than sitting unread. Markdown is
 * supported. Without `author_id` the comment posts as the API token.
 */
const action: ActionDefinition = {
  key: "conversation-comment-add",
  type: "perform",
  resource: "comment",
  title: "Add internal comment",
  description:
    "Post an internal note on a conversation. The team sees it; the customer never does — " +
    "unlike Reply, which sends.",
  idempotent: false,
  params: [
    CONVERSATION_PARAM,
    {
      key: "body",
      label: "Comment",
      type: "text",
      required: true,
      default: "",
      hint: "Markdown. `@name` mentions a teammate.",
    },
    {
      key: "authorId",
      label: "Author",
      type: "string",
      default: "",
      placeholder: "tea_55c8c149",
      hint: "Teammate id or `alt:email:…`. Omitted, the comment posts as the API token.",
    },
    {
      key: "isPinned",
      label: "Pin To Conversation",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Pinned comments stay visible at the top — useful for context a whole team needs.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "body", type: "string", label: "Body" },
    { key: "posted_at", type: "number", label: "Posted At" },
    { key: "author", type: "object", label: "Author" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const conversationId = String(p.conversationId ?? "");
    if (!conversationId) throw new Error("`conversationId` is required");
    const body = String(p.body ?? "");
    if (!body.trim()) throw new Error("`body` is required");

    ctx.log("info", "commenting on Front conversation", { conversationId });
    return await new FrontClient(ctx).request(
      `/conversations/${encodeURIComponent(conversationId)}/comments`,
      {
        method: "POST",
        body: {
          body,
          ...compact({ author_id: p.authorId }),
          ...(p.isPinned === true ? { is_pinned: true } : {}),
        },
      },
    );
  },
};

export default action;
