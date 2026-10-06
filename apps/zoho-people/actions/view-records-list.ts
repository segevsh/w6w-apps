import type { ActionDefinition } from "@w6w/types";
import { identifier, peopleGet } from "../lib/people.ts";

interface Input {
  viewName: string;
  sIndex?: number;
  rec_limit?: number;
  searchColumn?: string;
  searchValue?: string;
  modifiedtime?: number;
}

const viewRecordsList: ActionDefinition<Input> = {
  key: "view-records-list",
  type: "read",
  resource: "record",
  title: "List Records By View",
  description:
    "Fetch the records of a form's view (e.g. `P_EmployeeView`) keyed by the view's display column names. The API is rate-limited to 30 calls/minute.",
  params: [
    {
      key: "viewName",
      label: "View name",
      type: "string",
      required: true,
      placeholder: "P_EmployeeView",
      hint: "From List Form Views.",
    },
    { key: "sIndex", label: "Start index", type: "number", default: 1 },
    {
      key: "rec_limit",
      label: "Records",
      type: "number",
      default: 200,
      hint: "Number of records; the API documents a minimum of 10 and default 200.",
    },
    {
      key: "searchColumn",
      label: "Search column",
      type: "select",
      options: [
        { value: "EMPLOYEEID", label: "Employee ID" },
        { value: "EMPLOYEEMAILALIAS", label: "Employee email" },
      ],
    },
    { key: "searchValue", label: "Search value", type: "string" },
    {
      key: "modifiedtime",
      label: "Modified after",
      type: "number",
      hint: "Timestamp in milliseconds.",
    },
  ],
  output: [
    { key: "records", type: "array", label: "Records" },
    { key: "count", type: "number", label: "Records returned" },
  ],

  async execute(input, ctx) {
    if (input.searchColumn && !input.searchValue) {
      throw new Error("`searchValue` is required when `searchColumn` is set.");
    }
    const { result } = await peopleGet(
      ctx,
      `/forms/${identifier(input.viewName, "view name")}/records`,
      {
        sIndex: input.sIndex,
        rec_limit: input.rec_limit,
        searchColumn: input.searchColumn,
        searchValue: input.searchValue,
        modifiedtime: input.modifiedtime,
      },
    );
    const records = Array.isArray(result) ? result : [];
    return { records, count: records.length };
  },
};

export default viewRecordsList;
