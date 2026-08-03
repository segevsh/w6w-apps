import type { ActionDefinition } from "@w6w/types";
import { FreshserviceClient, unset } from "../lib/client.ts";
import { orderTypeParam, pagination, workspaceId } from "../lib/params.ts";

interface Input {
  filter?: string;
  search?: string;
  trashed?: boolean;
  includeTypeFields?: boolean;
  orderBy?: string;
  orderType?: string;
  workspaceId?: number;
  page?: number;
  perPage?: number;
}

const assetGetMany: ActionDefinition<Input> = {
  key: "asset-get-many",
  type: "search",
  resource: "asset",
  title: "List Assets",
  description:
    "List CMDB assets, newest first. Assets not in the trash are returned unless `Trashed` is set.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint: "Freshservice filter syntax, e.g. `asset_type_id:25`.",
      row: "narrow",
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Freshservice search syntax over the supported asset fields.",
      row: "narrow",
    },
    { key: "trashed", label: "Trashed", type: "boolean", row: "flags" },
    {
      key: "includeTypeFields",
      label: "Include type fields",
      type: "boolean",
      row: "flags",
      hint: "Adds the asset-type-specific attributes. Costs two extra API credits.",
    },
    {
      key: "orderBy",
      label: "Sort by",
      type: "select",
      row: "sort",
      advanced: true,
      default: "created_at",
      options: [
        { value: "created_at", label: "Created" },
        { value: "updated_at", label: "Updated" },
        { value: "id", label: "ID" },
      ],
    },
    { ...orderTypeParam, advanced: true },
    { ...workspaceId, hint: "0 returns assets from every workspace, with global fields only." },
    ...pagination,
  ],
  output: [{ key: "assets", type: "array", label: "Assets" }],

  async execute(input, ctx) {
    const assets = await new FreshserviceClient(ctx).resource<unknown[]>("assets", "/assets", {
      query: {
        filter: unset(input.filter),
        search: unset(input.search),
        trashed: input.trashed,
        include: input.includeTypeFields ? "type_fields" : undefined,
        order_by: unset(input.orderBy),
        order_type: unset(input.orderType),
        workspace_id: input.workspaceId,
        page: input.page,
        per_page: input.perPage,
      },
    });
    return { assets };
  },
};

export default assetGetMany;
