import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId, type PageMeta, toList } from "../lib/client.ts";
import {
  accountIdParam,
  dateRangeParams,
  fieldsParam,
  leadStatusOptions,
  paginationParams,
  tagsFilterParam,
} from "../lib/params.ts";

/**
 * `GET /v3/a/{account_id}/form_submissions.json` — Listing All Form
 * Submissions.
 *
 * The reference flags `created_at` as sortable but notes it "will be
 * deprecated as a sortable field in the future" in favor of `submitted_at` —
 * both are offered here, with the hint carrying that forward rather than
 * dropping `created_at` outright.
 */
interface Input {
  accountId: string;
  companyId?: string;
  personLead?: boolean;
  leadStatus?: "good_lead" | "not_a_lead" | "not_scored";
  tags?: string;
  fields?: string;
  sort?: "created_at" | "submitted_at" | "form_url";
  order?: "asc" | "desc";
  page?: number;
  perPage?: number;
  dateRange?: string;
  startDate?: string;
  endDate?: string;
  timeZone?: string;
}

const formSubmissionList: ActionDefinition<Input> = {
  key: "form-submission-list",
  type: "search",
  resource: "form-submission",
  title: "List Form Submissions",
  description: "List form submissions tracked in a CallRail account.",
  params: [
    accountIdParam,
    {
      key: "companyId",
      label: "Company",
      type: "string",
      hint: "Limit to one company's form submissions.",
    },
    {
      key: "personLead",
      label: "Has an associated lead only",
      type: "boolean",
    },
    { key: "leadStatus", label: "Lead status", type: "select", options: leadStatusOptions },
    tagsFilterParam,
    {
      ...fieldsParam,
      hint: "Comma-separated extra fields, e.g. milestones.",
    },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      options: [
        { value: "submitted_at", label: "Submitted at (recommended)" },
        {
          value: "created_at",
          label: "Created at (being deprecated as sortable — prefer " +
            "Submitted at)",
        },
        { value: "form_url", label: "Form URL" },
      ],
    },
    {
      key: "order",
      label: "Sort order",
      type: "select",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
    },
    ...paginationParams(),
    ...dateRangeParams(),
  ],
  output: [
    { key: "form_submissions", type: "array", label: "Form submissions" },
    { key: "page", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Records per page" },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "totalRecords", type: "number", label: "Total matching form submissions" },
  ],

  async execute(input, ctx) {
    const body = await new CallRailClient(ctx).json<
      PageMeta & { form_submissions: unknown[] }
    >(
      `/a/${encodeId(input.accountId)}/form_submissions.json`,
      {
        query: {
          company_id: input.companyId,
          person_lead: input.personLead,
          lead_status: input.leadStatus,
          tags: toList(input.tags),
          fields: input.fields,
          sort: input.sort,
          order: input.order,
          page: input.page,
          per_page: input.perPage,
          date_range: input.startDate ? undefined : input.dateRange,
          start_date: input.startDate,
          end_date: input.endDate,
          time_zone: input.timeZone,
        },
      },
    );
    return {
      form_submissions: body.form_submissions,
      page: body.page,
      perPage: body.per_page,
      totalPages: body.total_pages,
      totalRecords: body.total_records,
    };
  },
};

export default formSubmissionList;
