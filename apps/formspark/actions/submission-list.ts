import type { ActionDefinition } from "@w6w/types";
import { FormsparkClient, seg } from "../lib/client.ts";
import {
  formIdParam,
  limitParam,
  pageOutput,
  searchParam,
  startingAfterParam,
} from "../lib/params.ts";

interface Input {
  formId: string;
  limit?: number;
  startingAfter?: string;
  search?: string;
}

/**
 * `GET /forms/{formId}/submissions` — each submission is `{id, formId, data, createdAt}`, with
 * the visitor's fields under `data`. Cursor paginated; branch on `hasMore`.
 */
const submissionList: ActionDefinition<Input> = {
  key: "submission-list",
  type: "search",
  resource: "submission",
  title: "List Form Submissions",
  description: "List a form's submissions, optionally filtered by search text. Requires " +
    "submissions:read on an upgraded workspace.",
  params: [formIdParam, limitParam, startingAfterParam, searchParam],
  output: pageOutput,

  execute(input, ctx) {
    return new FormsparkClient(ctx).get(`/forms/${seg(input.formId, "formId")}/submissions`, {
      limit: input.limit,
      startingAfter: input.startingAfter,
      search: input.search,
    });
  },
};

export default submissionList;
