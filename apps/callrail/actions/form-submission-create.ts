import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, CallRailClient, encodeId } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

/**
 * `POST /v3/a/{account_id}/form_submissions.json` — record a form submission
 * against a company.
 *
 * The reference lists `referrer`, `referring_url`, `landing_page_url` and
 * `form_url` as `required`, then in the same field notes `session_id` "can be
 * provided instead of the referrer, referring_url, and landing_page_url" —
 * two ways to satisfy the requirement, not four independently-required
 * fields. All are exposed as optional params here (`form_url` alone stays
 * required, since nothing substitutes for it), matching the vendor's actual
 * either/or rather than the field table's literal wording.
 */
interface Input {
  accountId: string;
  companyId: string;
  formUrl: string;
  formData: unknown;
  referrer?: string;
  referringUrl?: string;
  landingPageUrl?: string;
  sessionId?: string;
}

const formSubmissionCreate: ActionDefinition<Input> = {
  key: "form-submission-create",
  type: "perform",
  resource: "form-submission",
  title: "Create Form Submission",
  description: "Record a form submission against a company. Provide either Session ID, or " +
    "Referrer + Referring URL + Landing page URL.",
  idempotent: false,
  params: [
    accountIdParam,
    { key: "companyId", label: "Company", type: "string", required: true },
    { key: "formUrl", label: "Form URL", type: "string", required: true },
    {
      key: "formData",
      label: "Form data",
      type: "json",
      required: true,
      hint: "Object of the submitted form's field names and values.",
    },
    {
      key: "sessionId",
      label: "Session ID",
      type: "string",
      hint: "If set, Referrer / Referring URL / Landing page URL may be left empty.",
    },
    { key: "referrer", label: "Referrer", type: "string", hint: "e.g. google_paid." },
    { key: "referringUrl", label: "Referring URL", type: "string" },
    { key: "landingPageUrl", label: "Landing page URL", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Form submission ID" },
    { key: "company_id", type: "string", label: "Company ID" },
    { key: "person_id", type: "string", label: "Person ID" },
    { key: "submitted_at", type: "string", label: "Submitted at" },
    { key: "first_form", type: "boolean", label: "First form from this person" },
  ],

  execute(input, ctx) {
    return new CallRailClient(ctx).json(
      `/a/${encodeId(input.accountId)}/form_submissions.json`,
      {
        method: "POST",
        body: {
          company_id: input.companyId,
          form_url: input.formUrl,
          form_data: asOptionalJson(input.formData, "Form data"),
          session_id: input.sessionId,
          referrer: input.referrer,
          referring_url: input.referringUrl,
          landing_page_url: input.landingPageUrl,
        },
      },
    );
  },
};

export default formSubmissionCreate;
