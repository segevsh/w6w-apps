import type { ActionDefinition } from "@w6w/types";
import { InstagramClient, seg } from "../lib/client.ts";

interface Input {
  commentId: string;
  hide?: boolean;
}

/**
 * Hide or unhide a comment — `POST /{ig-comment-id}?hide=true|false`. Comments the
 * media owner wrote on their own media are always shown regardless. Setting the
 * same state twice is harmless, so the action is `idempotent`.
 */
const hideComment: ActionDefinition<Input, { success: boolean }> = {
  key: "hide-comment",
  type: "perform",
  resource: "comment",
  title: "Hide Comment",
  description: "Hide (or unhide) a comment on one of the account's posts.",
  idempotent: true,
  params: [
    { key: "commentId", label: "Comment ID", type: "string", required: true },
    {
      key: "hide",
      label: "Hide",
      type: "boolean",
      default: true,
      hint: "On to hide the comment, off to show it again.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    return new InstagramClient(ctx).request<{ success: boolean }>(`/${seg(input.commentId)}`, {
      method: "POST",
      params: { hide: input.hide ?? true },
    });
  },
};

export default hideComment;
