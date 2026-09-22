import type { ActionDefinition } from "@w6w/types";
import { SimpleTextingClient } from "../lib/client.ts";
import { accountPhoneParam, paginationParams, sinceParam } from "../lib/params.ts";

/**
 * `GET /api/messages` — "Get all Messages".
 *
 * A page of `Message` rows: `{id, subject, text, contactPhone, accountPhone,
 * directionType, timestamp, referenceType, category, mediaItems}`. Rows are
 * ordered by sent/received time.
 *
 * ## `accountPhone` is a filter with a default you can trip over
 *
 * The document: "The phone number on your account the messages were sent to. If
 * blank, the request will return the messages sent to the primary account
 * phone." So an account that sends from a secondary number and does not pass
 * `accountPhone` gets a list that looks empty or stale rather than one that is
 * wrong — pass the number you care about, from `phone-list`.
 *
 * `directionType` is `MT` for messages sent *to* a contact's phone and `MO` for
 * messages sent *from* one (the document's own expansion: Mobile Terminating /
 * Mobile Originating). That is the field to filter a two-way conversation into
 * a "did they reply?" branch on; it must be done after the read, because this
 * endpoint declares no direction filter.
 */
interface Input {
  page?: number;
  size?: number;
  accountPhone?: string;
  contactPhone?: string;
  since?: string;
}

const messageList: ActionDefinition<Input> = {
  key: "message-list",
  type: "search",
  resource: "message",
  title: "List Messages",
  description: "List messages sent to and from an account phone number.",
  params: [
    ...paginationParams(),
    accountPhoneParam,
    {
      key: "contactPhone",
      label: "Contact phone",
      type: "string",
      placeholder: "1234567890",
      hint: "Only messages to or from this contact, as one side of a conversation.",
    },
    sinceParam,
  ],
  output: [
    { key: "content", type: "array", label: "Messages" },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "totalElements", type: "number", label: "Total elements" },
  ],

  execute(input, ctx) {
    return new SimpleTextingClient(ctx).page("/api/messages", {
      query: {
        page: input.page,
        size: input.size,
        accountPhone: input.accountPhone,
        contactPhone: input.contactPhone,
        since: input.since,
      },
    });
  },
};

export default messageList;
