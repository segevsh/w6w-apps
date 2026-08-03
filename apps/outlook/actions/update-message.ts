import type { ActionDefinition } from "@w6w/types";
import { compact, GraphClient } from "../lib/client.ts";
import { importanceParam } from "../lib/params.ts";

interface Input {
  messageId: string;
  isRead?: boolean;
  categories?: string[];
  importance?: string;
  inferenceClassification?: string;
  flagStatus?: string;
}

/**
 * `PATCH /me/messages/{id}` — mark read, categorise, flag, reprioritise.
 *
 * https://learn.microsoft.com/en-us/graph/api/message-update
 *
 * Graph's updatable-property table splits in two: most writable properties
 * (`subject`, `body`, `toRecipients`, …) are updatable **only while
 * `isDraft` is true**, and a handful apply to any message. This action exposes
 * only the second group, so it never half-succeeds against a sent message:
 * `isRead`, `categories`, `importance`, `inferenceClassification`, `flag`.
 * Editing a draft's content is Create Draft's job.
 *
 * Requires the `Mail.ReadWrite` scope. Answers `200 OK` with the message.
 */
const updateMessage: ActionDefinition<Input> = {
  key: "update-message",
  type: "perform",
  resource: "message",
  title: "Update Message",
  description:
    "Mark a message read or unread, set categories, importance, focus, or a follow-up flag.",
  // A PATCH that sets the same fields to the same values converges — replaying
  // it is safe.
  idempotent: true,
  params: [
    { key: "messageId", label: "Message ID", type: "string", required: true },
    { key: "isRead", label: "Mark as read", type: "boolean" },
    {
      key: "categories",
      label: "Categories",
      type: "string",
      repeat: true,
      hint:
        "Replaces the whole list. Categories must already exist in the mailbox to render in colour.",
    },
    importanceParam,
    {
      key: "inferenceClassification",
      label: "Focused Inbox",
      type: "select",
      advanced: true,
      options: [
        { value: "focused", label: "Focused" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "flagStatus",
      label: "Follow-up flag",
      type: "select",
      advanced: true,
      options: [
        { value: "notFlagged", label: "Not flagged" },
        { value: "flagged", label: "Flagged" },
        { value: "complete", label: "Complete" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "isRead", type: "boolean", label: "Is read" },
    { key: "categories", type: "array", label: "Categories" },
    { key: "importance", type: "string", label: "Importance" },
    { key: "flag", type: "object", label: "Follow-up flag" },
  ],

  execute(input, ctx) {
    const body = compact({
      isRead: input.isRead,
      categories: input.categories,
      importance: input.importance,
      inferenceClassification: input.inferenceClassification,
      flag: input.flagStatus ? { flagStatus: input.flagStatus } : undefined,
    });

    if (Object.keys(body).length === 0) {
      throw new Error("update-message: supply at least one property to change.");
    }

    const client = new GraphClient(ctx);
    return client.request(`/me/messages/${encodeURIComponent(input.messageId)}`, {
      method: "PATCH",
      body,
    });
  },
};

export default updateMessage;
