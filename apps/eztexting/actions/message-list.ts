import type { ActionDefinition } from "@w6w/types";
import { compact, EzTextingClient } from "../lib/client.ts";
import { pageOutput, paginationParams, sortParam } from "../lib/params.ts";

/** `GET /v1/messages` — list messages matching the filters (sent and received). */
interface Input {
  userNumber?: string;
  contactNumber?: string;
  messageId?: string;
  incoming?: boolean;
  unread?: boolean;
  deleted?: boolean;
  pending?: boolean;
  group?: boolean;
  textQuery?: string;
  type?: string;
  optType?: string;
  sentAfter?: string;
  sentBefore?: string;
  page?: number;
  size?: string;
  sort?: string;
}

const messageList: ActionDefinition<Input> = {
  key: "message-list",
  type: "search",
  resource: "message",
  title: "List Messages",
  description: "List sent and received messages, filtered by number, direction, type or date.",
  params: [
    { key: "userNumber", label: "Your sending number", type: "string" },
    { key: "contactNumber", label: "Contact number", type: "string" },
    {
      key: "incoming",
      label: "Incoming only",
      type: "boolean",
      hint: "True for received messages, false for sent. Leave unset for both.",
    },
    { key: "textQuery", label: "Text contains", type: "string" },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [{ value: "sms", label: "SMS" }, { value: "mms", label: "MMS" }],
    },
    {
      key: "sentAfter",
      label: "Sent after",
      type: "datetime",
      hint: "e.g. 2020-01-03T10:15:30+00:00",
    },
    { key: "sentBefore", label: "Sent before", type: "datetime" },
    { key: "messageId", label: "Message ID", type: "string", advanced: true },
    { key: "unread", label: "Unread", type: "boolean", advanced: true },
    { key: "deleted", label: "Include deleted", type: "boolean", advanced: true },
    { key: "pending", label: "Include pending", type: "boolean", advanced: true },
    { key: "group", label: "Group chats", type: "boolean", advanced: true },
    {
      key: "optType",
      label: "Opt type",
      type: "select",
      options: [
        { value: "optOut", label: "Opt out" },
        { value: "optIn", label: "Opt in" },
        { value: "none", label: "Neither" },
      ],
      advanced: true,
    },
    ...paginationParams(),
    sortParam(),
  ],
  output: pageOutput("Messages"),

  execute(input, ctx) {
    return new EzTextingClient(ctx).page("/messages", {
      query: compact({
        page: input.page,
        size: input.size,
        sort: input.sort,
        "filters[userNumber][eq]": input.userNumber,
        "filters[contactNumber][eq]": input.contactNumber,
        "filters[messageId][eq]": input.messageId,
        "filters[unread][eq]": input.unread,
        "filters[deleted][eq]": input.deleted,
        "filters[pending][eq]": input.pending,
        "filters[incoming][eq]": input.incoming,
        "filters[textQuery][eq]": input.textQuery,
        "filters[group][eq]": input.group,
        "filters[type][eq]": input.type,
        "filters[optType][eq]": input.optType,
        "filters[sentAt][gte]": input.sentAfter,
        "filters[sentAt][lte]": input.sentBefore,
      }) as Record<string, string>,
    });
  },
};

export default messageList;
