import type { ActionDefinition } from "@w6w/types";
import { encodeId, flag01, YouformClient } from "../lib/client.ts";

interface Input {
  form: string;
  is_complete?: boolean;
  sort_by?: string;
  sort_by_order?: "asc" | "desc";
  per_page?: number;
  page?: number;
}

/**
 * `GET /api/forms/{slug}/submissions`.
 *
 * Quoted from the collection: oldest first by default; `sort_by=created_at&
 * sort_by_order=desc` for newest first; 20 per page, up to `per_page=100`;
 * `is_complete` true/1 = completed only, false/0 = partial only, omitted = all.
 *
 * Trap: **free-plan accounts must not send `is_complete` at all** — they get
 * completed submissions only by default, and `is_complete=false` answers HTTP
 * 400. So an unset toggle is omitted, never sent as `0`.
 *
 * Rows are at `data.data`, and each row's `data` is keyed by *block id* (see
 * `form-get`), with composite blocks (address, contact) as nested objects.
 */
const submissionList: ActionDefinition<Input> = {
  key: "submission-list",
  type: "search",
  resource: "submission",
  title: "List submissions",
  description: "List a form's submissions, completed, partial or both, newest or oldest first.",
  params: [
    {
      key: "form",
      label: "Form slug",
      type: "string",
      required: true,
      hint: "The slug in the form's share link, not the numeric id.",
    },
    {
      key: "is_complete",
      label: "Completed only",
      type: "boolean",
      hint: "On: completed submissions only. Off: partial submissions only (paid plans only — " +
        "a free plan answers 400). Leave unset for the default; do not set it on a free plan.",
    },
    {
      key: "sort_by",
      label: "Sort by",
      type: "string",
      hint: "A submission field such as created_at. Oldest first when unset.",
    },
    {
      key: "sort_by_order",
      label: "Sort order",
      type: "select",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
    },
    {
      key: "per_page",
      label: "Per page",
      type: "number",
      validation: { integer: true, min: 1, max: 100 },
      hint: "Defaults to 20; the maximum is 100.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "Paginator: current_page and data[] (submissions keyed by block id)",
    },
  ],

  execute(input, ctx) {
    return new YouformClient(ctx).json(`/forms/${encodeId(input.form)}/submissions`, {
      query: {
        is_complete: flag01(input.is_complete),
        sort_by: input.sort_by,
        sort_by_order: input.sort_by_order,
        per_page: input.per_page,
        page: input.page,
      },
    });
  },
};

export default submissionList;
