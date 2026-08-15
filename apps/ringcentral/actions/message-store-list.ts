import type { ActionDefinition } from "@w6w/types";
import { API_PREFIX, encodeId, flag, RingCentralClient } from "../lib/client.ts";
import {
  accountIdParam,
  dateRangeParams,
  extensionIdParam,
  messageAvailabilityOptions,
  messageDirectionOptions,
  messageReadStatusOptions,
  messageTypeOptions,
  paginationParams,
} from "../lib/params.ts";

/**
 * `GET /restapi/v1.0/account/{accountId}/extension/{extensionId}/message-store`
 * — the extension's unified mailbox: SMS, voicemail, fax and pager messages
 * together. Needs `ReadMessages` (app + user).
 *
 * Every list action elsewhere in this app defaults `availability` to the
 * vendor's own behaviour (all statuses); this one param is worth calling out
 * because a workflow that forgets it will see soft-deleted messages
 * (`availability: "Deleted"`) mixed in with live ones.
 */
interface Input {
  accountId?: string;
  extensionId?: string;
  availability?: string[];
  direction?: string[];
  messageType?: string[];
  readStatus?: string[];
  dateFrom?: string;
  dateTo?: string;
  phoneNumber?: string;
  distinctConversations?: boolean;
  page?: number;
  perPage?: number;
}

const messageStoreList: ActionDefinition<Input> = {
  key: "message-store-list",
  type: "search",
  resource: "message",
  title: "List Messages",
  description: "List messages (SMS, voicemail, fax, pager) from an extension's mailbox.",
  params: [
    accountIdParam,
    extensionIdParam,
    {
      key: "availability",
      label: "Availability",
      type: "multiselect",
      options: messageAvailabilityOptions,
      hint: "Leave empty to include Alive, Deleted and Purged messages.",
    },
    {
      key: "direction",
      label: "Direction",
      type: "multiselect",
      options: messageDirectionOptions,
    },
    {
      key: "messageType",
      label: "Message type",
      type: "multiselect",
      options: messageTypeOptions,
    },
    {
      key: "readStatus",
      label: "Read status",
      type: "multiselect",
      options: messageReadStatusOptions,
    },
    ...dateRangeParams("Defaults to dateTo minus 24 hours."),
    { key: "phoneNumber", label: "Phone number", type: "string", placeholder: "+15555550100" },
    {
      key: "distinctConversations",
      label: "Latest message per conversation only",
      type: "boolean",
    },
    ...paginationParams(100, "RingCentral's own default."),
  ],
  output: [
    { key: "records", type: "array", label: "Messages" },
    { key: "paging", type: "object", label: "page / perPage / totalPages / totalElements" },
    { key: "navigation", type: "object", label: "First/next/previous/last page links" },
  ],

  execute(input, ctx) {
    return new RingCentralClient(ctx).request(
      `${API_PREFIX}/account/${encodeId(input.accountId)}/extension/${
        encodeId(input.extensionId)
      }/message-store`,
      {
        query: {
          availability: input.availability,
          direction: input.direction,
          messageType: input.messageType,
          readStatus: input.readStatus,
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
          phoneNumber: input.phoneNumber,
          distinctConversations: flag(input.distinctConversations),
          page: input.page,
          perPage: input.perPage,
        },
      },
    );
  },
};

export default messageStoreList;
