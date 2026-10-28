import type { ActionDefinition } from "@w6w/types";
import { MessengerClient, pageSegment, requireString } from "../lib/client.ts";

type SenderAction = "typing_on" | "typing_off" | "mark_seen" | "react" | "unreact";

interface Input {
  recipientId: string;
  action: SenderAction;
  messageId?: string;
  reaction?: string;
  pageId?: string;
}

/**
 * Show a typing indicator, mark the conversation seen, or react to / unreact from a
 * message — `POST /{page}/messages` carrying only `recipient` and `sender_action`.
 *
 * The reaction forms put `message_id` (and `reaction`, an emoji) in a `payload` object.
 * Sender-action requests may not carry any other Send API property such as text.
 */
const sendSenderAction: ActionDefinition<Input, { recipient_id: string }> = {
  key: "send-sender-action",
  type: "perform",
  resource: "message",
  title: "Send Sender Action",
  description: "Show typing, mark messages as seen, or react to a message.",
  idempotent: true,
  params: [
    {
      key: "recipientId",
      label: "Recipient (PSID)",
      type: "string",
      required: true,
      hint: "The recipient must be signed in for the indicator to be displayed.",
    },
    {
      key: "action",
      label: "Action",
      type: "select",
      required: true,
      default: "typing_on",
      options: [
        { value: "typing_on", label: "Typing on" },
        { value: "typing_off", label: "Typing off" },
        { value: "mark_seen", label: "Mark seen" },
        { value: "react", label: "React to a message" },
        { value: "unreact", label: "Remove a reaction" },
      ],
    },
    {
      key: "messageId",
      label: "Message ID",
      type: "string",
      hint: "Required for react and unreact.",
    },
    {
      key: "reaction",
      label: "Reaction emoji",
      type: "string",
      hint: "Required for react. Changing a reaction means calling react again with a new emoji.",
    },
    {
      key: "pageId",
      label: "Page ID",
      type: "string",
      hint: "Defaults to `me`.",
    },
  ],
  output: [{ key: "recipient_id", type: "string", label: "Recipient ID" }],

  execute(input, ctx) {
    const body: Record<string, unknown> = {
      recipient: { id: requireString("recipientId", input.recipientId) },
      sender_action: input.action,
    };
    if (input.action === "react" || input.action === "unreact") {
      const payload: Record<string, unknown> = {
        message_id: requireString("messageId", input.messageId),
      };
      if (input.action === "react") payload.reaction = requireString("reaction", input.reaction);
      body.payload = payload;
    }
    return new MessengerClient(ctx).request<{ recipient_id: string }>(
      `/${pageSegment(input.pageId)}/messages`,
      { method: "POST", body },
    );
  },
};

export default sendSenderAction;
