import type { ActionDefinition } from "@w6w/types";
import { IroncladClient } from "../lib/client.ts";
import { filterParam, pageParams, searchParam } from "../lib/params.ts";

interface Input {
  page?: number;
  pageSize?: number;
  filter?: string;
  search?: string;
  sortField?: string;
  sortDirection?: string;
}

const entityList: ActionDefinition<Input> = {
  key: "entity-list",
  type: "read",
  resource: "entity",
  title: "List Entities",
  description:
    "List the legal entities (counterparties, subsidiaries) that workflows and records refer to.",
  params: [
    ...pageParams,
    filterParam,
    searchParam,
    {
      key: "sortField",
      label: "Sort by",
      type: "select",
      options: [
        { value: "name", label: "Name" },
        { value: "lastUpdated", label: "Last updated" },
      ],
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      options: [
        { value: "ASC", label: "Ascending" },
        { value: "DESC", label: "Descending" },
      ],
    },
  ],
  output: [{ key: "list", type: "array", label: "Entities on this page" }, {
    key: "count",
    type: "number",
    label: "Total matching",
  }],

  execute(input, ctx) {
    return new IroncladClient(ctx).json("/entities", {
      query: {
        page: input.page,
        pageSize: input.pageSize,
        filter: input.filter,
        search: input.search,
        sortField: input.sortField,
        sortDirection: input.sortDirection,
      },
    });
  },
};

export default entityList;
