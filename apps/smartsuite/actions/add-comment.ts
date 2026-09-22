import type { ActionDefinition } from "@w6w/types";
import { SmartSuiteClient } from "../lib/client.ts";

interface Input {
  recordId: string;
  message: Record<string, unknown>;
  assignedTo?: string;
}

/**
 * `POST /comments/?record={recordId}` — post a comment on a record.
 *
 * The comment body is a **SmartDoc** rich-text document, not a plain string:
 * `{ "data": { "type": "doc", "content": [ … ] } }`. Its node/mark tree is too
 * deep (and too version-specific) to enumerate as a form, so `message` is
 * accepted as one opaque `json` param and sent under the documented `message`
 * body key.
 *
 * `assignedTo` is a member id (from `list-members`); it is sent as the
 * documented `assigned_to` key and is omitted entirely when not supplied, so a
 * plain comment does not carry a null assignee.
 */
const addComment: ActionDefinition<Input> = {
  key: "add-comment",
  type: "perform",
  resource: "comment",
  title: "Add Comment",
  description:
    "Post a SmartDoc comment on a SmartSuite record (POST /comments/?record={recordId}).",
  idempotent: false,
  params: [
    {
      key: "recordId",
      label: "Record ID",
      type: "string",
      required: true,
      hint: "The `id` of the record to comment on.",
    },
    {
      key: "message",
      label: "Message (SmartDoc)",
      type: "json",
      required: true,
      hint: 'A SmartDoc document: `{ "data": { "type": "doc", "content": [ … ] } }`.',
    },
    {
      key: "assignedTo",
      label: "Assign to (member ID)",
      type: "string",
      hint: "A member id from List Members; sent as the `assigned_to` body key.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Comment ID" },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = { message: input.message };
    if (input.assignedTo !== undefined && input.assignedTo !== "") {
      body.assigned_to = input.assignedTo;
    }
    return new SmartSuiteClient(ctx).request("comments/", {
      method: "POST",
      query: { record: input.recordId },
      body,
    });
  },
};

export default addComment;
