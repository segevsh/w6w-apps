import type { ActionDefinition } from "@w6w/types";
import { flattenBulkRecords } from "../lib/client.ts";
import { identifier, peopleGet, requirePositiveLimit } from "../lib/people.ts";
import { formLinkName, limitParam } from "../lib/params.ts";

export interface RecordListInput {
  formLinkName: string;
  sIndex?: number;
  limit?: number;
  searchColumn?: string;
  searchValue?: string;
  modifiedtime?: number;
}

const recordList: ActionDefinition<RecordListInput> = {
  key: "record-list",
  type: "read",
  resource: "record",
  title: "List Records",
  description:
    "Fetch records of any form (employee, leave, a custom form) with their tabular-section rows, up to 200 per call. Page with `sIndex` (starts at 1).",
  params: [
    formLinkName,
    { key: "sIndex", label: "Start index", type: "number", default: 1, hint: "1-based." },
    limitParam,
    {
      key: "searchColumn",
      label: "Search column",
      type: "select",
      options: [
        { value: "EMPLOYEEID", label: "Employee ID" },
        { value: "EMPLOYEEMAILALIAS", label: "Employee email" },
      ],
      hint: "Optional; the only two search columns the API documents.",
    },
    { key: "searchValue", label: "Search value", type: "string" },
    {
      key: "modifiedtime",
      label: "Modified after",
      type: "number",
      hint: "Only records added or modified after this timestamp, in milliseconds.",
    },
  ],
  output: [
    { key: "records", type: "array", label: "Records, each with `recordId` plus its fields" },
    { key: "count", type: "number", label: "Records returned" },
    { key: "message", type: "string", label: "Vendor message" },
  ],

  async execute(input, ctx) {
    if (input.searchColumn && !input.searchValue) {
      throw new Error("`searchValue` is required when `searchColumn` is set.");
    }
    const { result, message } = await peopleGet(
      ctx,
      `/forms/${identifier(input.formLinkName)}/getRecords`,
      {
        sIndex: input.sIndex,
        limit: requirePositiveLimit(input.limit),
        searchColumn: input.searchColumn,
        searchValue: input.searchValue,
        modifiedtime: input.modifiedtime,
      },
    );
    const records = flattenBulkRecords(result);
    return { records, count: records.length, message };
  },
};

export default recordList;
