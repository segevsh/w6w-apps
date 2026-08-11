import type { ActionDefinition } from "@w6w/types";
import { HousecallClient, type NormalizedList } from "../lib/client.ts";
import { companyIdParam, listOutput, paginationParams, sortDirectionParam } from "../lib/params.ts";

/** `GET /tags` — the company's tag vocabulary, with the ids Add Job Tag needs. */
interface Input {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
  companyId?: string;
}

const tagList: ActionDefinition<Input, NormalizedList> = {
  key: "tag-list",
  type: "read",
  resource: "tag",
  title: "Get Tags",
  description: "List the company's tags. Add Job Tag takes an id from here, not a name.",
  params: [
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      default: "created_at",
      options: [
        { value: "created_at", label: "Created at (default)" },
        { value: "name", label: "Name" },
      ],
    },
    sortDirectionParam,
    ...paginationParams(50),
    companyIdParam,
  ],
  output: listOutput("Tags"),

  execute(input, ctx) {
    return new HousecallClient(ctx).list("/tags", "tags", {
      companyId: input.companyId,
      query: {
        page: input.page,
        page_size: input.pageSize,
        sort_by: input.sortBy,
        sort_direction: input.sortDirection,
      },
    });
  },
};

export default tagList;
