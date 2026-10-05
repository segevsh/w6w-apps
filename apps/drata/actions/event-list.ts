import type { ActionDefinition } from "@w6w/types";
import { DrataClient, toList } from "../lib/client.ts";
import { eventSources, expandParam, opts, pageParams } from "../lib/params.ts";

/**
 * `GET /events` — List the account's audit-style events (who changed what, when), filtered by category, source or time window.
 *
 * Cursor-paginated: pass the result's `nextCursor` back as `cursor` until it is `null`.
 */
interface Input {
  type?: string;
  category?: string;
  source?: string;
  workspaceId?: number;
  userId?: number;
  createdAtStartDate?: string;
  createdAtEndDate?: string;
  expand?: string[] | string;
  cursor?: string;
  size?: number;
  includeTotalCount?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "event-list",
  type: "search",
  resource: "event",
  title: "List Events",
  description:
    "List the account's audit-style events (who changed what, when), filtered by category, source or time window.",
  params: [
    {
      key: "type",
      label: "Event type",
      type: "string",
      hint: "One of Drata's event type codes, e.g. `EMPLOYMENT_STATUS_UPDATED`.",
    },
    {
      key: "category",
      label: "Category",
      type: "string",
      hint: "e.g. `VENDOR`, `RISK`, `PERSONNEL`, `MONITOR`.",
    },
    { key: "source", label: "Source", type: "select", options: opts(eventSources) },
    { key: "workspaceId", label: "Workspace ID", type: "number" },
    { key: "userId", label: "User ID", type: "number" },
    { key: "createdAtStartDate", label: "Created from", type: "datetime", hint: "ISO 8601." },
    { key: "createdAtEndDate", label: "Created to", type: "datetime", hint: "ISO 8601." },
    expandParam(["connection", "issues", "metadata", "testId", "testName", "user"]),
    ...pageParams,
  ],
  output: [
    { key: "items", type: "array", label: "Events" },
    {
      key: "nextCursor",
      type: "string",
      label: "Cursor for the next page (null on the last page)",
    },
    {
      key: "totalCount",
      type: "number",
      label: "Total matching records (only with Include total count, first page)",
    },
  ],

  execute(input, ctx) {
    return new DrataClient(ctx).list(`/events`, {
      "type": input.type,
      "category": input.category,
      "source": input.source,
      "workspaceId": input.workspaceId,
      "userId": input.userId,
      "createdAtStartDate": input.createdAtStartDate,
      "createdAtEndDate": input.createdAtEndDate,
      "expand[]": toList(input.expand),
      cursor: input.cursor,
      size: input.size,
      includeTotalCount: input.includeTotalCount || undefined,
    });
  },
};

export default action;
