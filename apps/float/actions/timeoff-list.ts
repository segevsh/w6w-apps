import type { ActionDefinition } from "@w6w/types";
import { FloatClient } from "../lib/client.ts";
import {
  dateRangeParams,
  fieldsParam,
  modifiedSinceParam,
  paginationParams,
  sortParam,
} from "../lib/params.ts";

/**
 * `GET /v3/timeoffs` — list scheduled time off.
 *
 * Repeating time off is also returned if its `repeat_end` falls within the
 * requested date range, per the vendor's own note.
 */
interface Input {
  start_date?: string;
  end_date?: string;
  full_day?: number;
  status?: number;
  timeoff_type_id?: number;
  page?: number;
  "per-page"?: number;
  sort?: string;
  modified_since?: string;
  fields?: string;
}

const timeoffList: ActionDefinition<Input> = {
  key: "timeoff-list",
  type: "read",
  resource: "timeoff",
  title: "List Time Off",
  description: "List scheduled time off. Repeating entries are included if they recur into range.",
  params: [
    ...dateRangeParams(),
    {
      key: "full_day",
      label: "Full day only",
      type: "select",
      options: [{ value: 1, label: "Full day" }, { value: 0, label: "Partial day" }],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: 1, label: "Tentative" }, { value: 2, label: "Confirmed" }],
    },
    {
      key: "timeoff_type_id",
      label: "Time off type ID",
      type: "number",
      validation: { integer: true },
    },
    ...paginationParams(),
    sortParam,
    modifiedSinceParam,
    fieldsParam,
  ],
  output: [
    { key: "timeoff_id", type: "number", label: "Time off ID" },
    { key: "timeoff_type_id", type: "number", label: "Time off type ID" },
    { key: "start_date", type: "string", label: "Start date" },
    { key: "end_date", type: "string", label: "End date" },
    { key: "people_ids", type: "array", label: "People assigned" },
  ],

  async execute(input, ctx) {
    const { items, pagination } = await new FloatClient(ctx).list("/timeoffs", {
      start_date: input.start_date,
      end_date: input.end_date,
      full_day: input.full_day,
      status: input.status,
      timeoff_type_id: input.timeoff_type_id,
      page: input.page,
      "per-page": input["per-page"],
      sort: input.sort,
      modified_since: input.modified_since,
      fields: input.fields,
    });
    return { items, pagination };
  },
};

export default timeoffList;
