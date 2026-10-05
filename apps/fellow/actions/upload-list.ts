import type { ActionDefinition } from "@w6w/types";
import { compact, FellowClient, nonEmpty, paginationBody } from "../lib/client.ts";
import { CURSOR, ON_BEHALF_OF, PAGE_SIZE, windowParams } from "../lib/params.ts";

interface Input {
  pageSize?: number;
  cursor?: string;
  status?: string;
  eventGuid?: string;
  channelId?: string;
  title?: string;
  createdAtStart?: string;
  createdAtEnd?: string;
  updatedAtStart?: string;
  updatedAtEnd?: string;
  onBehalfOf?: string;
}

const uploadList: ActionDefinition<Input> = {
  key: "upload-list",
  type: "search",
  resource: "recording",
  title: "List Uploads",
  description: "List API-uploaded recordings with their import status, one page at a time.",
  params: [
    PAGE_SIZE,
    CURSOR,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "PENDING", label: "Pending" }, { value: "SUCCESS", label: "Success" }, {
        value: "FAILED",
        label: "Failed",
      }],
      hint: "Only uploads in this import state.",
    },
    { key: "eventGuid", label: "Calendar event GUID", type: "string" },
    { key: "channelId", label: "Channel ID", type: "string" },
    { key: "title", label: "Title", type: "string" },
    ...windowParams("uploads"),
    ON_BEHALF_OF,
  ],
  output: [
    { key: "items", type: "array", label: "Uploads on this page" },
    { key: "cursor", type: "string", label: "Cursor for the next page (null at the end)" },
    { key: "pageSize", type: "number", label: "Page size used" },
    { key: "hasMore", type: "boolean", label: "Whether another page exists" },
  ],

  execute(input, ctx) {
    return new FellowClient(ctx).page("uploads", "/recordings/upload/list", {
      method: "POST",
      body: compact({
        pagination: paginationBody(input.pageSize, input.cursor),
        filters: nonEmpty({
          status: input.status,
          event_guid: input.eventGuid,
          channel_id: input.channelId,
          title: input.title,
          created_at_start: input.createdAtStart,
          created_at_end: input.createdAtEnd,
          updated_at_start: input.updatedAtStart,
          updated_at_end: input.updatedAtEnd,
        }),
      }),
      onBehalfOf: input.onBehalfOf,
    });
  },
};

export default uploadList;
