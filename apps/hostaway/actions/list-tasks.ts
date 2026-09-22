import type { ActionDefinition } from "@w6w/types";
import { asNumber, asText, HostawayClient } from "../lib/client.ts";

/**
 * List tasks. Wraps `GET /v1/tasks`.
 *
 * Documented query parameters, verbatim: `limit` ("Maximum number of items in the
 * list"), `offset` ("Number of items to skip from beginning of the list"), `channelId`,
 * `reservationId`, `match`, and `status` / `canStartFromEvent` / `shouldEndByEvent` /
 * `canStartFromStart` / `canStartFromEnd` / `shouldEndByStart` / `shouldEndByEnd`.
 *
 * Response: "An array of task objects." — the documented Task object carries `id`,
 * `listingMapId`, `channelId`, `reservationId`, `assigneeUserId`, `title`, `description`,
 * `canStartFrom`, `shouldEndBy`, `status`, `priority`, `cost`, `costCurrency`, `color`
 * and so on.
 */
const action: ActionDefinition = {
  key: "list-tasks",
  type: "search",
  resource: "task",
  title: "List tasks",
  description: "List tasks, filtered by channel, reservation, status or a start/end window.",
  params: [
    { key: "limit", label: "Limit", type: "number" },
    { key: "offset", label: "Offset", type: "number", default: 0 },
    { key: "channelId", label: "Channel ID", type: "number" },
    { key: "reservationId", label: "Reservation ID", type: "number" },
    { key: "match", label: "Search", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "", label: "Any" },
        { value: "pending", label: "Pending" },
        { value: "confirmed", label: "Confirmed" },
        { value: "inProgress", label: "In progress" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
    { key: "canStartFromStart", label: "Can start from", type: "date" },
    { key: "canStartFromEnd", label: "Can start until", type: "date" },
    { key: "shouldEndByStart", label: "Should end after", type: "date" },
    { key: "shouldEndByEnd", label: "Should end by", type: "date" },
  ],
  output: [
    { key: "items", type: "array", label: "Tasks" },
    { key: "count", type: "number", label: "Total matching tasks" },
    { key: "page", type: "number", label: "Page number" },
    { key: "totalPages", type: "number", label: "Total pages" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    return await new HostawayClient(ctx).requestPage("/tasks", {
      query: {
        limit: asNumber(p.limit),
        offset: asNumber(p.offset),
        channelId: asNumber(p.channelId),
        reservationId: asNumber(p.reservationId),
        match: asText(p.match),
        status: asText(p.status),
        canStartFromStart: asText(p.canStartFromStart),
        canStartFromEnd: asText(p.canStartFromEnd),
        shouldEndByStart: asText(p.shouldEndByStart),
        shouldEndByEnd: asText(p.shouldEndByEnd),
      },
    });
  },
};

export default action;
