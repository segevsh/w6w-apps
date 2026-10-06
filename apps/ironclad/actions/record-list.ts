import type { ActionDefinition } from "@w6w/types";
import { IroncladClient } from "../lib/client.ts";
import { filterParam, hydrateEntitiesParam, pageParams, searchParam } from "../lib/params.ts";

interface Input {
  page?: number;
  pageSize?: number;
  types?: string;
  lastUpdated?: string;
  filter?: string;
  search?: string;
  sortField?: string;
  sortDirection?: string;
  hydrateEntities?: boolean;
  addressAsObject?: boolean;
}

const recordList: ActionDefinition<Input> = {
  key: "record-list",
  type: "read",
  resource: "record",
  title: "List Records",
  description:
    "List contract records in the repository, with filtering, search and sorting. Sorted by agreement date, newest first, unless told otherwise.",
  params: [
    ...pageParams,
    {
      key: "types",
      label: "Record types",
      type: "string",
      hint: "Restrict to these record types, as Ironclad's `types` filter takes them.",
    },
    {
      key: "lastUpdated",
      label: "Updated since",
      type: "string",
      hint: "Only records updated since this UTC date.",
    },
    filterParam,
    searchParam,
    {
      key: "sortField",
      label: "Sort by",
      type: "select",
      default: "agreementDate",
      options: [
        { value: "agreementDate", label: "Agreement date" },
        { value: "name", label: "Name" },
        { value: "lastUpdated", label: "Last updated" },
      ],
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      default: "DESC",
      options: [
        { value: "ASC", label: "Ascending" },
        { value: "DESC", label: "Descending" },
      ],
    },
    hydrateEntitiesParam,
    {
      key: "addressAsObject",
      label: "Addresses as objects",
      type: "boolean",
      default: false,
      hint: "Return address properties as structured objects instead of strings.",
    },
  ],
  output: [{ key: "list", type: "array", label: "Records on this page" }, {
    key: "count",
    type: "number",
    label: "Total matching across all pages",
  }],

  execute(input, ctx) {
    return new IroncladClient(ctx).json("/records", {
      query: {
        page: input.page,
        pageSize: input.pageSize,
        types: input.types,
        lastUpdated: input.lastUpdated,
        filter: input.filter,
        search: input.search,
        sortField: input.sortField,
        sortDirection: input.sortDirection,
        hydrateEntities: input.hydrateEntities ? true : undefined,
        addressAsObject: input.addressAsObject ? true : undefined,
      },
    });
  },
};

export default recordList;
