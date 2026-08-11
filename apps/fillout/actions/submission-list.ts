import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, FilloutClient } from "../lib/client.ts";
import {
  formIdParam,
  includeEditLinkParam,
  submissionPaginationParams,
  submissionSortOptions,
  submissionStatusOptions,
} from "../lib/params.ts";

/**
 * `GET /v1/api/forms/{formId}/submissions` — a page of responses.
 *
 * The response is `{responses, totalResponses, pageCount}`, so paging is
 * `offset`-driven and self-describing: `pageCount` is computed against the
 * `limit` you sent, and `totalResponses` counts everything matching the filters
 * rather than everything in the form.
 *
 * ## Three defaults that surprise people
 *
 * **Only finished submissions come back.** `status` defaults to `finished`;
 * partial responses exist but are invisible until you ask for `in_progress`.
 * So an empty page is not evidence that nobody started the form.
 *
 * **Preview responses are excluded.** `includePreview` defaults off, which is
 * why a submission you just made from the form editor's preview does not appear.
 *
 * **Oldest first.** `sort` defaults to `asc`, which is the safe order for
 * paging while new responses arrive — a `desc` scan shifts every offset as soon
 * as someone submits. Set `desc` for "show me the newest", not for a full scan.
 *
 * `afterDate`/`beforeDate` are date-time strings; Fillout documents the format
 * as `date-time` and nothing narrower, so they are passed through verbatim
 * rather than reformatted here.
 */
interface Input {
  formId: string;
  limit?: number;
  offset?: number;
  status?: string;
  sort?: string;
  search?: string;
  afterDate?: string;
  beforeDate?: string;
  includeEditLink?: boolean;
  includePreview?: boolean;
}

const submissionList: ActionDefinition<Input> = {
  key: "submission-list",
  type: "search",
  resource: "submission",
  title: "Get Submissions",
  description: "List a form's submissions, with date, status, text-search and pagination filters.",
  params: [
    formIdParam,
    ...submissionPaginationParams(),
    {
      key: "status",
      label: "Status",
      type: "select",
      options: submissionStatusOptions,
      hint: "Leave empty for Fillout's default, which returns only finished submissions.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      options: submissionSortOptions,
      hint: "Leave empty for Fillout's default (oldest first), which is the order that makes " +
        "offset paging stable while new responses arrive.",
    },
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Return only submissions containing this text.",
    },
    {
      key: "afterDate",
      label: "Submitted after",
      type: "datetime",
      hint: "Only submissions made after this moment.",
    },
    {
      key: "beforeDate",
      label: "Submitted before",
      type: "datetime",
      hint: "Only submissions made before this moment.",
    },
    includeEditLinkParam,
    {
      key: "includePreview",
      label: "Include preview responses",
      type: "boolean",
      hint: "Off by default, matching the API: responses submitted from the form editor's " +
        "preview are excluded unless you turn this on.",
    },
  ],
  output: [
    { key: "responses", type: "array", label: "Submissions" },
    { key: "totalResponses", type: "number", label: "Total matching submissions" },
    { key: "pageCount", type: "number", label: "Pages at the requested limit" },
  ],

  execute(input, ctx) {
    return new FilloutClient(ctx).json(
      `/forms/${encodeId(input.formId)}/submissions`,
      {
        query: compact({
          limit: input.limit,
          offset: input.offset,
          status: input.status,
          sort: input.sort,
          search: input.search,
          afterDate: input.afterDate,
          beforeDate: input.beforeDate,
          // Both flags are documented as "pass true"; a `false` is the vendor's
          // own default, so absence expresses it without relying on how the API
          // parses the string "false".
          includeEditLink: input.includeEditLink === true ? true : undefined,
          includePreview: input.includePreview === true ? true : undefined,
        }),
      },
    );
  },
};

export default submissionList;
