import type { ActionDefinition } from "@w6w/types";
import { SolapiClient } from "../lib/client.ts";

/**
 * List Kakao Templates — List Kakao AlimTalk templates, filtered by channel, name or review status. Only APPROVED templates can be sent. Cursor-paged.
 *
 * Verified against the SOLAPI developer reference (solapi.com/developers/api, fetched 2026-10-06).
 */
interface Input {
  name?: string;
  channelId?: string;
  status?: string;
  limit?: number;
  startKey?: string;
}

const listKakaoTemplates: ActionDefinition<Input> = {
  key: "list-kakao-templates",
  type: "read",
  resource: "kakao",
  title: "List Kakao Templates",
  description:
    "List Kakao AlimTalk templates, filtered by channel, name or review status. Only APPROVED templates can be sent. Cursor-paged.",
  params: [
    {
      "key": "name",
      "label": "Name",
      "type": "string",
      "hint": "Template name filter.",
    },
    {
      "key": "channelId",
      "label": "Channel ID",
      "type": "string",
    },
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "hint": "Review status.",
      "options": [
        {
          "value": "PENDING",
          "label": "PENDING",
        },
        {
          "value": "INSPECTING",
          "label": "INSPECTING",
        },
        {
          "value": "APPROVED",
          "label": "APPROVED",
        },
        {
          "value": "REJECTED",
          "label": "REJECTED",
        },
      ],
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
      "label": "Templates on this page",
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
    return new SolapiClient(ctx).page("/kakao/v2/templates/", "templateList", {
      query: {
        name: input.name,
        channelId: input.channelId,
        status: input.status,
        limit: input.limit,
        startKey: input.startKey,
      },
    });
  },
};

export default listKakaoTemplates;
