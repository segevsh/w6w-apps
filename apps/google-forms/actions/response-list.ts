import type { ActionDefinition } from "@w6w/types";
import { extractFormId, GoogleFormsClient } from "../lib/client.ts";

interface Input {
  formId: string;
  filter?: string;
  submittedAfter?: string;
  pageSize?: number;
  pageToken?: string;
}

/**
 * `forms.responses.list` — GET /v1/forms/{formId}/responses
 *
 * The only supported filter is on `timestamp`, in exactly two shapes:
 *   `timestamp > N`   — submitted strictly after N
 *   `timestamp >= N`  — submitted at or after N
 * where N is RFC3339 UTC "Zulu" (`2014-10-02T15:01:23Z`). Nothing else is
 * filterable, so `submittedAfter` is offered as a convenience that builds the
 * `timestamp > N` form, and `filter` stays available for the `>=` variant.
 *
 * Page size is capped at 5000 by the service when unspecified. This is one of
 * Google's "expensive read" methods for quota purposes (450/min per project),
 * so poll it deliberately.
 */
const responseList: ActionDefinition<Input> = {
  key: "response-list",
  type: "read",
  resource: "response",
  title: "List Responses",
  description: "List a form's responses, optionally only those submitted after a timestamp.",
  params: [
    { key: "formId", label: "Form ID or URL", type: "string", required: true },
    {
      key: "submittedAfter",
      label: "Submitted After",
      type: "datetime",
      hint: "Convenience: builds `timestamp > <RFC3339>`. Ignored when Filter is set.",
    },
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint:
        'Raw filter. Only `timestamp > N` and `timestamp >= N` are supported, N in RFC3339 UTC "Zulu" form.',
      placeholder: "timestamp >= 2014-10-02T15:01:23Z",
    },
    {
      key: "pageSize",
      label: "Page Size",
      type: "number",
      hint: "Up to 5000 responses are returned when unset.",
      validation: { integer: true, min: 1 },
    },
    { key: "pageToken", label: "Page Token", type: "string" },
  ],
  output: [
    { key: "responses", type: "array", label: "Form responses" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  execute(input, ctx) {
    const client = new GoogleFormsClient(ctx);
    const filter = input.filter?.trim() ||
      (input.submittedAfter ? `timestamp > ${input.submittedAfter}` : undefined);
    return client.request(
      `/forms/${encodeURIComponent(extractFormId(input.formId))}/responses`,
      { query: { filter, pageSize: input.pageSize, pageToken: input.pageToken } },
    );
  },
};

export default responseList;
