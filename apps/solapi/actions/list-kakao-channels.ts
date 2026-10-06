import type { ActionDefinition } from "@w6w/types";
import { SolapiClient } from "../lib/client.ts";

/**
 * List Kakao Channels — List the Kakao channels linked to the account. A channel ID (pfId) is required to send AlimTalk.
 *
 * Verified against the SOLAPI developer reference (solapi.com/developers/api, fetched 2026-10-06).
 */
interface Input {
  channelId?: string;
  searchId?: string;
  phoneNumber?: string;
  limit?: number;
  startKey?: string;
}

const listKakaoChannels: ActionDefinition<Input> = {
  key: "list-kakao-channels",
  type: "read",
  resource: "kakao",
  title: "List Kakao Channels",
  description:
    "List the Kakao channels linked to the account. A channel ID (pfId) is required to send AlimTalk.",
  params: [
    {
      "key": "channelId",
      "label": "Channel ID",
      "type": "string",
    },
    {
      "key": "searchId",
      "label": "Search ID",
      "type": "string",
      "hint": "The channel handle, e.g. @example.",
    },
    {
      "key": "phoneNumber",
      "label": "Phone number",
      "type": "string",
    },
    {
      "key": "limit",
      "label": "Page size",
      "type": "number",
    },
    {
      "key": "startKey",
      "label": "Start key",
      "type": "string",
      "hint": "`nextKey` from the previous page, to fetch the next one.",
    },
  ],
  output: [
    {
      "key": "items",
      "type": "array",
      "label": "Channels on this page",
    },
    {
      "key": "count",
      "type": "number",
      "label": "Rows on this page",
    },
    {
      "key": "nextKey",
      "type": "string",
      "label": "Cursor for the next page, null on the last page",
    },
    {
      "key": "limit",
      "type": "number",
      "label": "Page size applied",
    },
  ],

  execute(input, ctx) {
    return new SolapiClient(ctx).page("/kakao/v2/channels", "channelList", {
      query: {
        channelId: input.channelId,
        searchId: input.searchId,
        phoneNumber: input.phoneNumber,
        limit: input.limit,
        startKey: input.startKey,
      },
    });
  },
};

export default listKakaoChannels;
