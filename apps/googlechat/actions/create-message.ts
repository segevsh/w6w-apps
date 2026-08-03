import type { ActionDefinition } from "@w6w/types";
import { GoogleChatClient, spaceName, threadName } from "../lib/client.ts";

interface Input {
  space: string;
  text: string;
  thread?: string;
  threadKey?: string;
  messageReplyOption?: "REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD" | "REPLY_MESSAGE_OR_FAIL";
  privateMessageViewer?: string;
  messageId?: string;
}

interface MessagePayload {
  text: string;
  thread?: { name?: string; threadKey?: string };
  privateMessageViewer?: { name: string };
}

/**
 * `spaces.messages.create` — POST /v1/{parent=spaces/*}/messages
 * https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.messages/create
 *
 * Text only, on purpose. `cardsV2`, `accessoryWidgets` and `actionResponse` are
 * documented as requiring **app authentication** — a user credential cannot send
 * them — so exposing them here would offer a field that always fails. The same
 * goes for `attachment`, which needs an upload through `media.upload` first.
 *
 * Threading has two mutually exclusive spellings and both are real: `thread.name`
 * (a server-assigned thread resource name, from a previous message's
 * `thread.name`) and `thread.threadKey` (a caller-chosen key). The deprecated
 * top-level `threadKey` *query* parameter is not exposed — `thread.threadKey`
 * is Google's replacement for it.
 *
 * `requestId` is filled from `ctx.invocation.invocationId`: Google returns the
 * message already created with that id rather than posting a duplicate, which is
 * exactly what makes a retried step safe.
 */
const createMessage: ActionDefinition<Input> = {
  key: "create-message",
  type: "perform",
  resource: "message",
  title: "Create Message",
  description:
    "Post a text message to a space, optionally in a thread or visible only to one user. Cards and attachments require app (bot) authentication and are not available with a user connection.",
  // Deduplicated server-side by `requestId` (the invocation id), so a retry
  // returns the same message rather than posting twice.
  idempotent: true,
  params: [
    {
      key: "space",
      label: "Space",
      type: "string",
      required: true,
      hint: "The space id, or the full resource name `spaces/{space}`.",
      placeholder: "spaces/AAAAAAAAAAA",
    },
    {
      key: "text",
      label: "Text",
      type: "text",
      required: true,
      hint: "Plain text with Chat's formatting markup (*bold*, _italic_, `code`).",
    },
    {
      key: "thread",
      label: "Thread",
      type: "string",
      hint:
        "Reply into an existing thread: the thread resource name from a previous message's `thread.name`. Mutually exclusive with Thread key.",
      placeholder: "spaces/AAAAAAAAAAA/threads/BBBBBBBBBBB",
    },
    {
      key: "threadKey",
      label: "Thread key",
      type: "string",
      hint:
        "A caller-chosen key that groups messages into a thread. Mutually exclusive with Thread. Up to 4,000 characters.",
    },
    {
      key: "messageReplyOption",
      label: "Reply option",
      type: "select",
      options: [
        {
          value: "REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD",
          label: "Reply to the thread, or start a new one if it does not exist",
        },
        { value: "REPLY_MESSAGE_OR_FAIL", label: "Reply to the thread, or fail" },
      ],
      hint: "Only supported in named spaces. Requires Thread or Thread key.",
    },
    {
      key: "privateMessageViewer",
      label: "Private message viewer",
      type: "string",
      hint:
        "Send the message privately to one user, as `users/{user}`. They must be a member of the space.",
      placeholder: "users/123456789",
    },
    {
      key: "messageId",
      label: "Custom message id",
      type: "string",
      hint:
        'Lets you address the message later without storing its system id. Must begin with "client-" and be at most 63 characters of lowercase letters, digits and hyphens.',
      placeholder: "client-daily-summary",
      validation: { maxLength: 63 },
    },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "text", type: "string", label: "Text" },
    { key: "createTime", type: "string", label: "Created at" },
    { key: "thread", type: "object", label: "Thread" },
    { key: "sender", type: "object", label: "Sender" },
  ],

  async execute(input, ctx) {
    const client = new GoogleChatClient(ctx);
    const body: MessagePayload = { text: input.text };
    if (input.thread) {
      body.thread = { name: threadName(input.space, input.thread) };
    } else if (input.threadKey) {
      body.thread = { threadKey: input.threadKey };
    }
    if (input.privateMessageViewer) {
      body.privateMessageViewer = { name: input.privateMessageViewer };
    }

    return await client.request(`/${spaceName(input.space)}/messages`, {
      method: "POST",
      body,
      query: {
        requestId: ctx.invocation?.invocationId,
        messageReplyOption: input.messageReplyOption,
        messageId: input.messageId,
      },
    });
  },
};

export default createMessage;
