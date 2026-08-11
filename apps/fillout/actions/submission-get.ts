import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, FilloutClient } from "../lib/client.ts";
import { formIdParam, includeEditLinkParam, submissionIdParam } from "../lib/params.ts";

/**
 * `GET /v1/api/forms/{formId}/submissions/{submissionId}` — one response.
 *
 * Note the response shape: it is `{"submission": {…}}`, **not** the submission
 * object itself, and not the `{responses: […]}` shape of the list endpoint.
 * This action returns the vendor body unchanged, so downstream steps read
 * `submission.questions`, matching Fillout's own reference.
 *
 * The form id is part of the path even though the submission id is already
 * unique — a submission cannot be fetched without knowing which form it belongs
 * to.
 */
interface Input {
  formId: string;
  submissionId: string;
  includeEditLink?: boolean;
}

const submissionGet: ActionDefinition<Input> = {
  key: "submission-get",
  type: "read",
  resource: "submission",
  title: "Get Submission",
  description: "Fetch a single submission by its ID, with every question response it carries.",
  params: [formIdParam, submissionIdParam, includeEditLinkParam],
  output: [{ key: "submission", type: "object", label: "The submission" }],

  execute(input, ctx) {
    return new FilloutClient(ctx).json(
      `/forms/${encodeId(input.formId)}/submissions/${encodeId(input.submissionId)}`,
      {
        query: compact({
          includeEditLink: input.includeEditLink === true ? true : undefined,
        }),
      },
    );
  },
};

export default submissionGet;
