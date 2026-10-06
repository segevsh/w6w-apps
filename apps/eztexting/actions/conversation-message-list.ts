import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, EzTextingClient } from "../lib/client.ts";
import { pageOutput, paginationParams, sortParam } from "../lib/params.ts";

/**
 * `GET /v1/conversations/conversation/{userNumber}/{contactNumber}` — the thread with one contact.
 * `read=true` marks the unread messages it returns as read — a side effect, so it is opt-in
 * (`markRead`, off by default).
 */
interface Input {
  userNumber: string;
  contactNumber: string;
  markRead?: boolean;
  page?: number;
  size?: string;
  sort?: string;
}

const conversationMessageList: ActionDefinition<Input> = {
  key: "conversation-message-list",
  type: "search",
  resource: "conversation",
  title: "List Conversation Messages",
  description: "List the messages in one conversation (the replies thread with a contact).",
  params: [
    { key: "userNumber", label: "Your sending number", type: "string", required: true },
    { key: "contactNumber", label: "Contact number", type: "string", required: true },
    {
      key: "markRead",
      label: "Mark returned messages as read",
      type: "boolean",
      default: false,
      hint: "Sent as `read=true`; marks every unread message it returns as read.",
      advanced: true,
    },
    ...paginationParams(),
    sortParam("sentAt,desc"),
  ],
  output: pageOutput("Messages"),

  execute(input, ctx) {
    return new EzTextingClient(ctx).page(
      `/conversations/conversation/${encodePathSegment(input.userNumber)}/${
        encodePathSegment(input.contactNumber)
      }`,
      {
        query: {
          read: input.markRead ? true : undefined,
          page: input.page,
          size: input.size,
          sort: input.sort,
        },
      },
    );
  },
};

export default conversationMessageList;
