import type { ActionDefinition } from "@w6w/types";
import { FireberryClient, PAGE_OUTPUT, pageOutput, type RecordPage, seg } from "../lib/client.ts";
import { OBJECT_PARAM, PAGENUMBER_PARAM, PAGESIZE_PARAM } from "../lib/params.ts";

interface Input {
  object: string;
  pageSize?: number;
  pageNumber?: number;
}

/** `GET /api/record/{object}` — one page of records with every field. */
const recordList: ActionDefinition<Input> = {
  key: "record-list",
  type: "search",
  resource: "record",
  title: "List Records",
  description:
    "List records of any object (accounts, contacts, opportunities, tasks, cases, custom objects) with all their fields, one page at a time. Limited to 10 pages of 50; use Query Records for filters and deeper paging.",
  params: [OBJECT_PARAM, PAGESIZE_PARAM, PAGENUMBER_PARAM],
  output: PAGE_OUTPUT as unknown as ActionDefinition["output"],

  async execute(input, ctx) {
    const body = await new FireberryClient(ctx).request<RecordPage>(
      "GET",
      `/api/record/${seg(input.object)}`,
      { query: { pagesize: input.pageSize, pagenumber: input.pageNumber } },
    );
    return pageOutput(body);
  },
};

export default recordList;
