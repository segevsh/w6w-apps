import type { ActionDefinition } from "@w6w/types";
import { encodeId, FilloutClient } from "../lib/client.ts";
import { formIdParam } from "../lib/params.ts";

/**
 * `GET /v1/api/forms/{formId}` — one form's schema.
 *
 * This is what you call before Create Submissions or before mapping a webhook
 * payload: it returns `questions` (each with `id`, `name` and `type`), plus
 * `calculations`, `urlParameters`, `scheduling`, `payments` and `quiz` when the
 * form uses them. The `id` of each question is the key Create Submissions
 * expects — the question *text* is not addressable.
 *
 * **Treat `type` as open.** Fillout's own reference carries a standing warning
 * on this endpoint: "New field types are added regularly. Your application
 * should discard fields with unknown types." The 37 types documented today
 * (Address … URLInput) are a snapshot, not a closed set, so this action returns
 * the vendor's payload unaltered rather than mapping types into a fixed
 * vocabulary that would silently drop tomorrow's.
 */
interface Input {
  formId: string;
}

const formGet: ActionDefinition<Input> = {
  key: "form-get",
  type: "read",
  resource: "form",
  title: "Get Form Metadata",
  description:
    "Fetch one form's questions, calculations, URL parameters and other metadata by form ID.",
  params: [formIdParam],
  output: [
    { key: "id", type: "string", label: "Form ID" },
    { key: "name", type: "string", label: "Form name" },
    { key: "questions", type: "array", label: "Questions" },
    { key: "calculations", type: "array", label: "Calculations" },
    { key: "urlParameters", type: "array", label: "URL parameters" },
    { key: "scheduling", type: "array", label: "Scheduling fields" },
    { key: "payments", type: "array", label: "Payment fields" },
    { key: "quiz", type: "object", label: "Quiz configuration" },
  ],

  execute(input, ctx) {
    return new FilloutClient(ctx).json(`/forms/${encodeId(input.formId)}`);
  },
};

export default formGet;
