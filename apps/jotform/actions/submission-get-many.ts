import type { ActionDefinition } from "@w6w/types";
import { JotformClient, serializeFilter } from "../lib/client.ts";
import { listOutput, pagination, type PaginationInput } from "../lib/params.ts";

interface Input extends PaginationInput {
  formId: string;
}

/**
 * GET /form/{formID}/submissions — one form's submissions. Each entry carries
 * an `answers` map keyed by question id, with `text` (the question label),
 * `type` (the control type) and `answer` (what the respondent entered).
 */
const submissionGetMany: ActionDefinition<Input> = {
  key: "submission-get-many",
  type: "search",
  resource: "submission",
  title: "Get Many Submissions",
  description: "List one form's submissions, with paging, ordering and filtering.",
  params: [
    {
      key: "formId",
      label: "Form ID",
      type: "string",
      required: true,
      hint: "The digits in a form's URL. Get IDs from Get Many Forms.",
    },
    ...pagination,
  ],
  output: listOutput,

  async execute(input, ctx) {
    const { content, resultSet, limitLeft } = await new JotformClient(ctx).request<unknown[]>(
      `/form/${encodeURIComponent(input.formId)}/submissions`,
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

export default submissionGetMany;
