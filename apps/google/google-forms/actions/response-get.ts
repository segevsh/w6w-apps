import type { ActionDefinition } from "@w6w/types";
import { extractFormId, GoogleFormsClient } from "../lib/client.ts";

interface Input {
  formId: string;
  responseId: string;
}

/**
 * `forms.responses.get` — GET /v1/forms/{formId}/responses/{responseId}
 *
 * Returns one `FormResponse`. Note that `formId` is omitted from the entries
 * returned by `responses.list` but present here, so this is also the way to
 * round-trip a response id back to its form.
 */
const responseGet: ActionDefinition<Input> = {
  key: "response-get",
  type: "read",
  resource: "response",
  title: "Get Response",
  description: "Fetch a single form response by ID.",
  params: [
    { key: "formId", label: "Form ID or URL", type: "string", required: true },
    { key: "responseId", label: "Response ID", type: "string", required: true },
  ],
  output: [
    { key: "responseId", type: "string", label: "Response ID" },
    { key: "formId", type: "string", label: "Form ID" },
    { key: "createTime", type: "string", label: "Created at" },
    { key: "lastSubmittedTime", type: "string", label: "Last submitted at" },
    { key: "respondentEmail", type: "string", label: "Respondent email" },
    { key: "answers", type: "object", label: "Answers keyed by question ID" },
    { key: "totalScore", type: "number", label: "Total score (quizzes)" },
  ],

  execute(input, ctx) {
    const client = new GoogleFormsClient(ctx);
    return client.request(
      `/forms/${encodeURIComponent(extractFormId(input.formId))}/responses/${
        encodeURIComponent(input.responseId)
      }`,
    );
  },
};

export default responseGet;
