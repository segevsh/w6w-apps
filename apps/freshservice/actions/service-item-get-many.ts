import type { ActionDefinition } from "@w6w/types";
import { FreshserviceClient } from "../lib/client.ts";
import { pagination, workspaceId } from "../lib/params.ts";

interface Input {
  categoryId?: number;
  workspaceId?: number;
  page?: number;
  perPage?: number;
}

const serviceItemGetMany: ActionDefinition<Input> = {
  key: "service-item-get-many",
  type: "read",
  resource: "service-item",
  title: "List Service Catalog Items",
  description:
    "List the service catalog. The `display_id` on each item is what a service request is placed against.",
  params: [
    { key: "categoryId", label: "Category ID", type: "number" },
    workspaceId,
    ...pagination,
  ],
  output: [{ key: "service_items", type: "array", label: "Service items" }],

  async execute(input, ctx) {
    const items = await new FreshserviceClient(ctx).resource<unknown[]>(
      "service_items",
      "/service_catalog/items",
      {
        query: {
          category_id: input.categoryId,
          workspace_id: input.workspaceId,
          page: input.page,
          per_page: input.perPage,
        },
      },
    );
    return { service_items: items };
  },
};

export default serviceItemGetMany;
