import type { ActionDefinition } from "@w6w/types";
import { EconomicClient, pageOf, seg } from "../lib/client.ts";
import { pageParams } from "../lib/factory.ts";

interface Input {
  accountingYear: string;
  filter?: string;
  sort?: string;
  pageSize?: number;
  skipPages?: number;
}

const entryList: ActionDefinition<Input> = {
  key: "entry-list",
  type: "read",
  resource: "entry",
  title: "List Account Entries",
  description: "List the finance entries (bookkeeping lines) of one accounting year.",
  params: [
    {
      key: "accountingYear",
      label: "Accounting year",
      type: "string",
      required: true,
      hint: "The `year` of an accounting year, e.g. `2022` (see List Accounting Years).",
    },
    ...pageParams,
  ],
  output: [
    { key: "items", type: "array", label: "Entries" },
    { key: "count", type: "number", label: "Items in this page" },
    { key: "total", type: "number", label: "Total matching" },
    { key: "hasMore", type: "boolean", label: "More pages available" },
    { key: "nextSkipPages", type: "number", label: "Pages to skip for the next page" },
  ],
  async execute(input, ctx) {
    const size = Math.min(Math.max(Number(input.pageSize ?? 100) || 100, 1), 1000);
    const body = await new EconomicClient(ctx).request(
      "GET",
      `/accounting-years/${seg(input.accountingYear)}/entries`,
      {
        query: {
          filter: input.filter,
          sort: input.sort,
          pagesize: size,
          skippages: input.skipPages ? Number(input.skipPages) : undefined,
        },
      },
    );
    return pageOf(body);
  },
};

export default entryList;
