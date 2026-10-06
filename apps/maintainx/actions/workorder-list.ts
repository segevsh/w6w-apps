import type { ActionDefinition } from "@w6w/types";
import { MaintainXClient, toIdList, toList } from "../lib/client.ts";
import {
  expandParam,
  organizationIdParam,
  paginationParams,
  prioritySelect,
} from "../lib/params.ts";

/**
 * `GET /v1/workorders` — filtered, cursor-paginated. Array filters are sent as
 * repeated keys, which is what the vendor documents (`statuses=OPEN&statuses=DONE`).
 */
interface Input {
  title?: string;
  statuses?: string | string[];
  priorities?: string | string[];
  assets?: string;
  locations?: string;
  assignees?: string;
  teams?: string;
  categories?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  createdAfter?: string;
  createdBefore?: string;
  sort?: string;
  expand?: string;
  limit?: number;
  cursor?: string;
  organizationId?: number;
}

const workorderList: ActionDefinition<Input> = {
  key: "workorder-list",
  type: "search",
  resource: "workorder",
  title: "List Work Orders",
  description: "List work orders, filtered by status, priority, asset, location, assignee or date.",
  params: [
    { key: "title", label: "Title contains", type: "string" },
    {
      key: "statuses",
      label: "Statuses",
      type: "multiselect",
      options: ["OPEN", "IN_PROGRESS", "ON_HOLD", "DONE", "CANCELED", "SKIPPED"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    { ...prioritySelect(), key: "priorities", label: "Priorities", type: "multiselect" },
    { key: "assets", label: "Asset IDs", type: "string", hint: "Comma-separated numeric ids." },
    {
      key: "locations",
      label: "Location IDs",
      type: "string",
      hint: "Comma-separated numeric ids.",
    },
    {
      key: "assignees",
      label: "Assignee user IDs",
      type: "string",
      hint: "Comma-separated numeric ids.",
    },
    { key: "teams", label: "Team IDs", type: "string", hint: "Comma-separated numeric ids." },
    {
      key: "categories",
      label: "Categories",
      type: "string",
      hint: "Comma-separated category labels or numeric ids.",
    },
    { key: "updatedAfter", label: "Updated at or after", type: "datetime" },
    { key: "updatedBefore", label: "Updated at or before", type: "datetime" },
    { key: "createdAfter", label: "Created at or after", type: "datetime" },
    { key: "createdBefore", label: "Created at or before", type: "datetime" },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      options: ["updatedAt", "createdAt", "dueDate", "startedAt", "completedAt"].flatMap((f) => [
        { value: f, label: `${f} (ascending)` },
        { value: `-${f}`, label: `${f} (descending)` },
      ]),
    },
    expandParam([
      "assignees",
      "categories",
      "parts",
      "asset",
      "location",
      "procedure",
      "extra_fields",
      "times",
      "expenditures",
    ]),
    ...paginationParams,
    organizationIdParam,
  ],
  output: [
    { key: "workOrders", type: "array", label: "Work orders" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page (null when done)" },
  ],

  async execute(input, ctx) {
    return await new MaintainXClient(ctx).list("/workorders", "workOrders", {
      title: input.title,
      statuses: toList(input.statuses),
      priorities: toList(input.priorities),
      assets: toIdList(input.assets, "assets"),
      locations: toIdList(input.locations, "locations"),
      assignees: toIdList(input.assignees, "assignees"),
      teams: toIdList(input.teams, "teams"),
      categories: toList(input.categories),
      "updatedAt[gte]": input.updatedAfter,
      "updatedAt[lte]": input.updatedBefore,
      "createdAt[gte]": input.createdAfter,
      "createdAt[lte]": input.createdBefore,
      sort: input.sort,
      expand: toList(input.expand),
      limit: input.limit,
      cursor: input.cursor,
    }, input.organizationId);
  },
};

export default workorderList;
