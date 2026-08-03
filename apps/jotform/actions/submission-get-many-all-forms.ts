import type { ActionDefinition } from "@w6w/types";
import { JotformClient, serializeFilter } from "../lib/client.ts";
import { listOutput, pagination, type PaginationInput } from "../lib/params.ts";

/**
 * GET /user/submissions — submissions across EVERY form on the account, not
 * just one. Same shape as the per-form list; the `filter` param is how you
 * narrow it (`{"formIDs":["…"]}`, `{"created_at:gt":"…"}`, `{"fullText":"…"}`
 * are the vendor's own documented examples).
 */
const submissionGetManyAllForms: ActionDefinition<PaginationInput> = {
  key: "submission-get-many-all-forms",
  type: "search",
  resource: "submission",
  title: "Get Many Submissions (All Forms)",
  description: "List submissions across every form on the account, with paging and filtering.",
  params: [...pagination],
  output: listOutput,

  async execute(input, ctx) {
    const { content, resultSet, limitLeft } = await new JotformClient(ctx).request<unknown[]>(
      "/user/submissions",
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

export default submissionGetManyAllForms;
