import type { ActionDefinition } from "@w6w/types";
import { FloatClient } from "../lib/client.ts";
import { fieldsParam, paginationParams } from "../lib/params.ts";

/**
 * `GET /v3/status` — list statuses.
 *
 * A Status is a short note tied to a date range and a person — "Travelling",
 * "Sick", "Office" — distinct from an Allocation or Time Off. Repeating
 * statuses are also returned if their `repeat_end_date` falls within the
 * requested date range.
 */
interface Input {
  people_id?: number;
  start_date?: string;
  end_date?: string;
  status_type_id?: number;
  page?: number;
  "per-page"?: number;
  fields?: string;
}

const statusList: ActionDefinition<Input> = {
  key: "status-list",
  type: "read",
  resource: "status",
  title: "List Statuses",
  description: 'List statuses (short notes like "Travelling" or "Office") for people.',
  params: [
    { key: "people_id", label: "Person ID", type: "number", validation: { integer: true } },
    { key: "start_date", label: "Start date", type: "date" },
    { key: "end_date", label: "End date", type: "date" },
    {
      key: "status_type_id",
      label: "Status type ID",
      type: "number",
      validation: { integer: true },
      hint: "Float's default types are 1 = Home, 2 = Travel, 3 = Custom, 4 = Office, but the API " +
        "exposes no endpoint to list the exact set configured for this team — check Admin " +
        "Settings in the Float UI.",
    },
    ...paginationParams(),
    fieldsParam,
  ],
  output: [
    { key: "status_id", type: "number", label: "Status ID" },
    { key: "status_type_id", type: "number", label: "Status type ID" },
    { key: "people_id", type: "number", label: "Person ID" },
    { key: "start_date", type: "string", label: "Start date" },
    { key: "end_date", type: "string", label: "End date" },
  ],

  async execute(input, ctx) {
    // Float answers an empty result set with 204 (no body), not 200 with an
    // empty array — list() already treats a 204 as an empty page.
    const { items, pagination } = await new FloatClient(ctx).list("/status", {
      people_id: input.people_id,
      start_date: input.start_date,
      end_date: input.end_date,
      status_type_id: input.status_type_id,
      page: input.page,
      "per-page": input["per-page"],
      fields: input.fields,
    });
    return { items, pagination };
  },
};

export default statusList;
