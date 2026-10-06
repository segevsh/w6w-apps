import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, optInt, pagingQuery, reqString } from "../lib/client.ts";

interface Input {
  timeSince: string;
  timeUntil: string;
  usersId?: number | string;
  customersId?: number | string;
  projectsId?: number | string;
  subprojectsId?: number | string;
  servicesId?: number | string;
  text?: string;
  enhancedList?: boolean;
  page?: number | string;
  itemsPerPage?: number | string;
}

const listEntries: ActionDefinition<Input> = {
  key: "list-entries",
  type: "search",
  resource: "entry",
  title: "List Time Entries",
  description:
    "List time entries in a time window (GET /v2/entries). `timeSince` and `timeUntil` are required ISO 8601 UTC timestamps; optionally filter by user, customer, project, subproject, service or text, and set `enhancedList` to add names, text and revenue. Paged.",
  params: [
    {
      key: "timeSince",
      label: "Time since",
      type: "string",
      required: true,
      hint: "ISO 8601 UTC, e.g. 2026-10-01T00:00:00Z.",
    },
    {
      key: "timeUntil",
      label: "Time until",
      type: "string",
      required: true,
      hint: "ISO 8601 UTC, e.g. 2026-10-31T23:59:59Z.",
    },
    {
      key: "usersId",
      label: "User ID",
      type: "number",
    },
    {
      key: "customersId",
      label: "Customer ID",
      type: "number",
    },
    {
      key: "projectsId",
      label: "Project ID",
      type: "number",
    },
    {
      key: "subprojectsId",
      label: "Subproject ID",
      type: "number",
    },
    {
      key: "servicesId",
      label: "Service ID",
      type: "number",
    },
    {
      key: "text",
      label: "Text contains",
      type: "string",
    },
    {
      key: "enhancedList",
      label: "Enhanced list",
      type: "boolean",
      hint:
        "Adds customer/project/service/user names, the text and (with rights) revenue to each entry.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1-based page number.",
    },
    {
      key: "itemsPerPage",
      label: "Items per page",
      type: "number",
      hint: "Page size.",
    },
  ],
  output: [
    {
      key: "paging",
      type: "object",
      label: "{ items_per_page, current_page, count_pages, count_items }",
    },
    { key: "entries", type: "array", label: "Time entries" },
  ],

  async execute(input, ctx) {
    const body = await new ClockodoClient(ctx).call("/v2/entries", {
      query: {
        time_since: reqString(input.timeSince, "timeSince"),
        time_until: reqString(input.timeUntil, "timeUntil"),
        enhanced_list: input.enhancedList,
        filter: {
          users_id: optInt(input.usersId, "usersId"),
          customers_id: optInt(input.customersId, "customersId"),
          projects_id: optInt(input.projectsId, "projectsId"),
          subprojects_id: optInt(input.subprojectsId, "subprojectsId"),
          services_id: optInt(input.servicesId, "servicesId"),
          text: input.text,
        },
        ...pagingQuery(input),
      },
    });
    return {
      paging: body.paging ?? null,
      entries: Array.isArray(body.entries) ? body.entries : [],
    };
  },
};

export default listEntries;
