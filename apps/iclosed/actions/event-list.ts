import type { ActionDefinition } from "@w6w/types";
import { IClosedClient } from "../lib/client.ts";

/**
 * `GET /v1/events` — List event types (booking pages).
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  limit?: number;
  page?: number;
  search?: string;
  userId?: number;
  eventType?: string;
  latestFirst?: string;
  sort?: string;
  showFeatureStatuses?: string;
}

const eventList: ActionDefinition<Input> = {
  key: "event-list",
  type: "read",
  resource: "event",
  title: "List events",
  description: "List event types (booking pages).",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true },
      hint: "Records per page.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true },
      hint: "Zero-based page index. Default 0.",
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Name, description, link prefix and vanity.",
    },
    {
      key: "userId",
      label: "Host user ID",
      type: "number",
      validation: { integer: true },
    },
    {
      key: "eventType",
      label: "Event type",
      type: "select",
      options: [{ value: "STRATEGY_EVENT", label: "Strategy" }, {
        value: "DISCOVERY_EVENT",
        label: "Discovery",
      }],
    },
    {
      key: "latestFirst",
      label: "Newest first",
      type: "select",
      options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }],
    },
    {
      key: "sort",
      label: "Name sort",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
    },
    {
      key: "showFeatureStatuses",
      label: "Include feature statuses",
      type: "select",
      options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }],
    },
  ],
  output: [
    { key: "data", type: "array", label: "Events" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/events", {
      query: {
        limit: input.limit,
        page: input.page,
        search: input.search,
        userId: input.userId,
        eventType: input.eventType,
        latestFirst: input.latestFirst,
        sort: input.sort,
        showFeatureStatuses: input.showFeatureStatuses,
      },
    });
  },
};

export default eventList;
