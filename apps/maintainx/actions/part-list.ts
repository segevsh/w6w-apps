import type { ActionDefinition } from "@w6w/types";
import { MaintainXClient, toList } from "../lib/client.ts";
import { expandParam, organizationIdParam, paginationParams } from "../lib/params.ts";

/** `GET /v1/parts` */
interface Input {
  partNumber?: string;
  updatedAfter?: string;
  createdAfter?: string;
  sort?: string;
  expand?: string;
  limit?: number;
  cursor?: string;
  organizationId?: number;
}

const partList: ActionDefinition<Input> = {
  key: "part-list",
  type: "search",
  resource: "part",
  title: "List Parts",
  description: "List spare parts with their stock quantities per location.",
  params: [
    { key: "partNumber", label: "Part numbers", type: "string", hint: "Comma-separated." },
    { key: "updatedAfter", label: "Updated at or after", type: "datetime" },
    { key: "createdAfter", label: "Created at or after", type: "datetime" },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      options: ["id", "createdAt", "updatedAt"].flatMap((f) => [
        { value: f, label: `${f} (ascending)` },
        { value: `-${f}`, label: `${f} (descending)` },
      ]),
    },
    expandParam(["extra_fields", "vendors", "asset_ids"]),
    ...paginationParams,
    organizationIdParam,
  ],
  output: [
    { key: "parts", type: "array", label: "Parts" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page (null when done)" },
  ],

  execute(input, ctx) {
    return new MaintainXClient(ctx).list("/parts", "parts", {
      partNumber: toList(input.partNumber),
      "updatedAt[gte]": input.updatedAfter,
      "createdAt[gte]": input.createdAfter,
      sort: input.sort,
      expand: toList(input.expand),
      limit: input.limit,
      cursor: input.cursor,
    }, input.organizationId);
  },
};

export default partList;
