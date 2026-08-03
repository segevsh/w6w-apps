import type { ActionDefinition } from "@w6w/types";
import { KajabiClient, unset } from "../lib/client.ts";
import {
  collectionOutput,
  pageNumberParam,
  pageSizeParam,
  siteFilterParam,
  sortParam,
} from "../lib/params.ts";

/**
 * `GET /v1/form_submissions` — who filled in what.
 *
 * The polling counterpart to Kajabi's outbound form-submission webhook. This
 * pack has no trigger surface, so a workflow that wants to react to new
 * submissions polls here — `sort=-created_at` with a small page size is the
 * usable pattern, since the spec offers no "since" filter on this collection.
 *
 * Note this endpoint declares no `fields[…]` parameter, unlike most of its
 * siblings, so none is offered.
 */
interface Input {
  siteId?: string;
  formId?: string;
  sort?: string;
  pageNumber?: number;
  pageSize?: number;
}

const formSubmissionList: ActionDefinition<Input> = {
  key: "form-submission-list",
  type: "search",
  resource: "form-submission",
  title: "List Form Submissions",
  description:
    "List form submissions, optionally for one form. Sort by `-created_at` to poll for new " +
    "ones — Kajabi publishes no 'since' filter here.",
  params: [
    siteFilterParam,
    {
      key: "formId",
      label: "Form ID",
      type: "string",
      hint: "Sent as `filter[form_id]`. `form-list` returns the ids.",
    },
    sortParam("name, email, created_at"),
    pageNumberParam,
    pageSizeParam,
  ],
  output: collectionOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request("/form_submissions", {
      query: {
        "filter[site_id]": unset(input.siteId),
        "filter[form_id]": unset(input.formId),
        sort: unset(input.sort),
        "page[number]": input.pageNumber,
        "page[size]": input.pageSize,
      },
    });
  },
};

export default formSubmissionList;
