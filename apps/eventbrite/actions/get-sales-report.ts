import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  eventIds: string[];
  eventStatus?: string;
  startDate?: string;
  endDate?: string;
  filterBy?: string;
  groupBy?: string;
  period?: number;
  dateFacet?: string;
  timezone?: string;
}

const GROUP_BY = [
  "payment_method",
  "payment_method_application",
  "ticket",
  "ticket_application",
  "currency",
  "event_currency",
  "reserved_section",
  "event",
  "event_ticket",
  "event_application",
  "country",
  "city",
  "state",
  "source",
  "zone",
  "location",
  "access_level",
  "device_name",
  "sales_channel_lvl_1",
  "sales_channel_lvl_2",
  "sales_channel_lvl_3",
  "delivery_method",
];
const DATE_FACETS = ["fifteen", "hour", "day", "event_day", "week", "month", "year", "none"];

const action: ActionDefinition<Input> = {
  key: "get-sales-report",
  type: "read",
  resource: "report",
  title: "Get Sales Report",
  description: "Retrieve a sales report by event IDs or event status.",
  idempotent: true,
  params: [
    {
      key: "eventIds",
      label: "Event IDs",
      type: "array",
      item: { type: "string" },
      required: true,
    },
    {
      key: "eventStatus",
      label: "Event status",
      type: "select",
      options: ["all", "live", "ended"].map((v) => ({ value: v, label: v })),
    },
    { key: "startDate", label: "Start date", type: "string" },
    { key: "endDate", label: "End date", type: "string" },
    {
      key: "filterBy",
      label: "Filter by (JSON)",
      type: "string",
      hint: 'e.g. {"ticket_ids": [1234], "currencies": ["USD"]}',
    },
    {
      key: "groupBy",
      label: "Group by",
      type: "select",
      options: GROUP_BY.map((v) => ({ value: v, label: v })),
    },
    {
      key: "period",
      label: "Period",
      type: "number",
      hint: "Time period in units of the date facet.",
    },
    {
      key: "dateFacet",
      label: "Date facet",
      type: "select",
      options: DATE_FACETS.map((v) => ({ value: v, label: v })),
    },
    { key: "timezone", label: "Timezone", type: "string", placeholder: "America/Los_Angeles" },
  ],
  output: [
    { key: "timezone", type: "string", label: "Timezone" },
    { key: "event_ids", type: "array", label: "Event IDs" },
    { key: "data", type: "array", label: "Report rows" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request("/reports/sales/", {
      query: {
        event_ids: input.eventIds.join(","),
        event_status: input.eventStatus,
        start_date: input.startDate,
        end_date: input.endDate,
        filter_by: input.filterBy,
        group_by: input.groupBy,
        period: input.period,
        date_facet: input.dateFacet,
        timezone: input.timezone,
      },
    });
  },
};

export default action;
