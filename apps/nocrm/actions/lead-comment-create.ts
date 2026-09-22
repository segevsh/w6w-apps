import type { ActionDefinition } from "@w6w/types";
import { NocrmClient, V2 } from "../lib/client.ts";
import { commentOutput } from "../lib/params.ts";

interface Input {
  leadId: string;
  content: string;
  userId?: string;
}

/**
 * `POST /api/v2/leads/{lead_id}/comments` — comment on a lead.
 *
 * The Create-a-comment-on-a-lead table in noCRM's API document
 * (<https://www.nocrm.io/api>, read 2026-09-22) marks `content` required and
 * `user_id` optional, with the note that it is "ignored in case of the login
 * method to authenticate is used. (USER token)" — a user token always comments
 * as its own user.
 *
 * The table also lists `attachments`, `activity_id` and `created_at`. They are
 * not exposed: `attachments` takes uploaded files, which is a separate
 * capability this app does not claim, and `activity_id`/`created_at` are
 * metadata the vendor sets on the paths this app does use (`lead-log-activity`
 * covers the activity case through the Simplified API).
 *
 * Not idempotent: each POST creates another comment.
 */
const leadCommentCreate: ActionDefinition<Input> = {
  key: "lead-comment-create",
  type: "perform",
  resource: "comment",
  title: "Comment on Lead",
  description: "Post a comment on a lead (POST /api/v2/leads/{lead_id}/comments).",
  idempotent: false,
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "string",
      required: true,
      hint: "The lead's id, as returned by Create Lead or List Leads.",
    },
    {
      key: "content",
      label: "Content",
      type: "text",
      required: true,
      config: { multiline: true },
      hint: "The content of the comment.",
    },
    {
      key: "userId",
      label: "Author",
      type: "string",
      hint: "User id or email the comment should belong to. API-key connections only — the " +
        "document says it is ignored under USER-token authentication.",
    },
  ],
  output: commentOutput,

  execute(input, ctx) {
    return new NocrmClient(ctx).request(
      `${V2}/leads/${encodeURIComponent(input.leadId)}/comments`,
      { method: "POST", body: { content: input.content, user_id: input.userId } },
    );
  },
};

export default leadCommentCreate;
