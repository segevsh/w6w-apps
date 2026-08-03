import type { ActionDefinition } from "@w6w/types";
import { JotformClient, serializeFilter } from "../lib/client.ts";
import { listOutput, pagination, type PaginationInput } from "../lib/params.ts";

/**
 * GET /user/forms — every form on the account, with title, status, created /
 * updated timestamps, unread count (`new`) and total submission count.
 */
const formGetMany: ActionDefinition<PaginationInput> = {
  key: "form-get-many",
  type: "search",
  resource: "form",
  title: "Get Many Forms",
  description: "List the forms on this account, with paging, ordering and filtering.",
  params: [...pagination],
  output: listOutput,

  async execute(input, ctx) {
    const { content, resultSet, limitLeft } = await new JotformClient(ctx).request<unknown[]>(
      "/user/forms",
      {
        query: {
          offset: input.offset,
          limit: input.limit,
          orderby: input.orderby,
          direction: input.direction,
          filter: serializeFilter(input.filter),
        },
      },
    );
    return { items: content ?? [], resultSet, limitLeft };
  },
};

export default formGetMany;
