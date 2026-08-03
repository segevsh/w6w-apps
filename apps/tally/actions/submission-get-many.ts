import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import {
  formIdParam,
  limitParam,
  type PageLimitInput,
  pageParam,
  submissionFilterOptions,
} from "../lib/params.ts";

interface Input extends PageLimitInput {
  formId: string;
  filter?: string;
  startDate?: string;
  endDate?: string;
  afterId?: string;
}

/**
 * GET /forms/{formId}/submissions — one form's submissions.
 *
 * The response does NOT use the `items` envelope. It returns `questions` (so
 * answers can be labelled without a second call) alongside `submissions`, plus
 * a `totalNumberOfSubmissionsPerFilter` breakdown of all / completed / partial
 * — and no `total`. All of that is surfaced rather than flattened.
 *
 * `afterId` is a cursor: it pages forward from a known submission id, which is
 * the reliable way to poll for new responses without re-reading a page whose
 * contents shifted. Tally's own docs still recommend a webhook over polling,
 * since deliveries do not count against the rate limit.
 */
const submissionGetMany: ActionDefinition<Input, Record<string, unknown>> = {
  key: "submission-get-many",
  type: "search",
  resource: "submission",
  title: "Get Many Submissions",
  description:
    "List a form's submissions, filtered by completion state and date, with the question set needed to label the answers.",
  params: [
    formIdParam,
    pageParam,
    limitParam(500, "Tally's default is 50."),
    {
      key: "filter",
      label: "Filter",
      type: "select",
      options: submissionFilterOptions,
      hint: "Restrict to completed or partial submissions. Defaults to all.",
    },
    {
      key: "startDate",
      label: "Start date",
      type: "datetime",
      hint: "Only submissions at or after this instant.",
    },
    {
      key: "endDate",
      label: "End date",
      type: "datetime",
      hint: "Only submissions at or before this instant.",
    },
    {
      key: "afterId",
      label: "After submission ID",
      type: "string",
      hint: "Cursor — return submissions recorded after this one. Useful for polling.",
    },
  ],
  output: [
    { key: "submissions", type: "array", label: "Submissions" },
    { key: "questions", type: "array", label: "The form's questions, for labelling answers" },
    { key: "page", type: "number", label: "Current page" },
    { key: "limit", type: "number", label: "Items per page" },
    { key: "hasMore", type: "boolean", label: "More pages available" },
    {
      key: "totalNumberOfSubmissionsPerFilter",
      type: "object",
      label: "Counts for all / completed / partial",
    },
  ],

  async execute(input, ctx) {
    const body = await new TallyClient(ctx).request<{
      submissions?: unknown[];
      questions?: unknown[];
      page?: number;
      limit?: number;
      hasMore?: boolean;
      totalNumberOfSubmissionsPerFilter?: Record<string, number>;
    }>(`/forms/${encodeURIComponent(input.formId)}/submissions`, {
      query: {
        page: input.page,
        limit: input.limit,
        filter: input.filter,
        startDate: input.startDate,
        endDate: input.endDate,
        afterId: input.afterId,
      },
    });
    return {
      submissions: body?.submissions ?? [],
      questions: body?.questions ?? [],
      page: body?.page,
      limit: body?.limit,
      hasMore: body?.hasMore,
      totalNumberOfSubmissionsPerFilter: body?.totalNumberOfSubmissionsPerFilter,
    };
  },
};

export default submissionGetMany;
