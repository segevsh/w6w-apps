import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  trackingId: string;
  profileUrn: string;
  commentUrn: string;
  commentText: string;
  mentionUser?: boolean;
  commenterName?: string;
}

const FIELDS: readonly Field[] = [
  ["trackingId", "tracking_id", "s"],
  ["profileUrn", "profile_urn", "s"],
  ["commentUrn", "comment_urn", "s"],
  ["commentText", "comment_text", "s"],
  ["mentionUser", "mention_user", "b"],
  ["commenterName", "commenter_name", "s"],
];

const commentReply: ActionDefinition<Input, ActionResult> = {
  key: "comment-reply",
  type: "perform",
  resource: "content",
  title: "Reply to Comment",
  description:
    "Reply to a comment on a post. trackingId, profileUrn and commentUrn come from Get Post Comments.",
  idempotent: false,
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      hint:
        "The LinkupAPI account_id of the connected LinkedIn (or WhatsApp / email) account. List Accounts returns it.",
    },
    { key: "trackingId", label: "Tracking ID", type: "string", required: true },
    { key: "profileUrn", label: "Post owner profile URN", type: "string", required: true },
    { key: "commentUrn", label: "Comment URN", type: "string", required: true },
    { key: "commentText", label: "Reply", type: "text", required: true },
    { key: "mentionUser", label: "Mention commenter", type: "boolean" },
    {
      key: "commenterName",
      label: "Commenter name",
      type: "string",
      hint: "Used when mentioning the commenter.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "content",
      "answer_comment",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default commentReply;
