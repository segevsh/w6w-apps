import type { ActionDefinition } from "@w6w/types";
import { KajabiClient } from "../lib/client.ts";
import { idParam, resourceOutput } from "../lib/params.ts";

/**
 * `GET /v1/form_submissions/{id}` — one submission.
 *
 * The spec declares no `fields[…]` or `include` on this operation, so neither
 * is offered.
 */
interface Input {
  id: string;
}

const formSubmissionGet: ActionDefinition<Input> = {
  key: "form-submission-get",
  type: "read",
  resource: "form-submission",
  title: "Get Form Submission",
  description: "Fetch one form submission by id.",
  params: [idParam("Submission ID", "`form-submission-list` returns the ids.")],
  output: resourceOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request(
      `/form_submissions/${encodeURIComponent(input.id)}`,
    );
  },
};

export default formSubmissionGet;
