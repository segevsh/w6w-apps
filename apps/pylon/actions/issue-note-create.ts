import type { ActionDefinition } from "@w6w/types";
import { compact, PylonClient, seg, strList } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
  bodyHtml: string;
  threadId?: string;
  messageId?: string;
  threadName?: string;
  userId?: string;
  attachmentUrls?: string[] | string;
}

/**
 * `POST /issues/{id}/note` — an internal note, never shown to the requester. `thread_id` and
 * `message_id` are mutually exclusive (both is a 400). Neither: posts to the latest Slack-backed
 * internal thread, or creates a Pylon-only one (named by `thread_name`).
 */
const issueNoteCreate: ActionDefinition<Input> = {
  key: "issue-note-create",
  type: "perform",
  resource: "message",
  title: "Post Internal Note",
  description: "Post an internal note on an issue. It is not visible to the requester.",
  idempotent: false,
  params: [
    idParam("Issue ID or number"),
    { key: "bodyHtml", label: "Body (HTML)", type: "text", required: true },
    {
      key: "threadId",
      label: "Internal thread ID",
      type: "string",
      hint:
        "The `id` (not `thread_id`) of a thread from `GET /issues/{id}/threads`. Exclusive with Message ID.",
    },
    {
      key: "messageId",
      label: "Internal note message ID",
      type: "string",
      hint: "Post into the thread holding this internal note. Exclusive with Thread ID.",
    },
    {
      key: "threadName",
      label: "New thread name",
      type: "string",
      hint:
        "Names a new Pylon-only thread; used only when no thread or message is given and no Slack-backed thread exists.",
    },
    { key: "userId", label: "Post as user ID", type: "string" },
    { key: "attachmentUrls", label: "Attachment URLs", type: "array", item: { type: "string" } },
  ],
  output: [
    { key: "id", type: "string", label: "New message ID" },
    { key: "issue_id", type: "string", label: "Issue ID" },
  ],

  execute(input, ctx) {
    return new PylonClient(ctx).one("POST", `/issues/${seg(input.id)}/note`, {
      body: compact({
        body_html: input.bodyHtml,
        thread_id: input.threadId,
        message_id: input.messageId,
        thread_name: input.threadName,
        user_id: input.userId,
        attachment_urls: strList(input.attachmentUrls),
      }),
    });
  },
};

export default issueNoteCreate;
