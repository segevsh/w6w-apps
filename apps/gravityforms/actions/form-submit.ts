import type { ActionDefinition } from "@w6w/types";
import { GravityFormsClient } from "../lib/client.ts";

interface Input {
  formId: string | number;
  inputValues: Record<string, unknown>;
  fieldValues?: Record<string, unknown>;
  sourcePage?: number;
  targetPage?: number;
}

/**
 * `POST /gf/v2/forms/[FORM_ID]/submissions` — a REAL form submission.
 *
 * ## This is not the same as Create Entry, and the difference matters
 *
 * The vendor's own words: the submissions endpoint "is used to create an entry
 * by sending input values through the **complete form submission process**",
 * which it enumerates as validation, "configured anti-spam checks e.g. honeypot,
 * captcha, Akismet etc.", add-on feeds, notifications, confirmations, and "all
 * the filters and action hooks triggered by a regular form submission".
 *
 * Create Entry (`POST /gf/v2/entries`) does NONE of that — it writes a row.
 * Pick this action when the submission should behave as if a human filled the
 * form in (charge the card, fire the Mailchimp feed, send the notification);
 * pick Create Entry when you are importing or back-filling data and explicitly
 * do not want those side effects.
 *
 * ## Addressing values
 *
 * Values are keyed by **field input name** — `input_1`, and `input_1_3` /
 * `input_1_6` for the sub-inputs of a composite field such as Name. That is a
 * different addressing scheme from Create Entry, which keys by field ID
 * (`"1.3"`). Get Form returns both.
 *
 * A submission is NOT rejected on validation failure: the endpoint answers 200
 * with `is_valid: false` and `validation_messages`. Check `is_valid` before
 * treating a run as successful.
 *
 * Gravity Forms capabilities are not required for this endpoint (REST API
 * authentication still is).
 */
const formSubmit: ActionDefinition<Input> = {
  key: "form-submit",
  type: "perform",
  resource: "form",
  title: "Submit Form",
  description:
    "Submit a form through the full submission pipeline — validation, anti-spam, add-on feeds, notifications and confirmations.",
  // Gravity Forms mints a fresh entry per accepted submission and offers no
  // request key to dedupe on, so a retry submits a second time (and re-fires
  // every feed and notification).
  idempotent: false,
  params: [
    { key: "formId", label: "Form ID", type: "string", required: true },
    {
      key: "inputValues",
      label: "Input Values",
      type: "json",
      required: true,
      hint: 'Keyed by field INPUT NAME, e.g. {"input_1_3":"Neil","input_1_6":"Armstrong",' +
        '"input_3":"neil@example.com"}. Use Get Form for the field IDs.',
    },
    {
      key: "fieldValues",
      label: "Field Values",
      type: "json",
      hint:
        "Dynamic population parameter keys with their values, used to populate fields configured " +
        "to allow dynamic population. Sent as `field_values`.",
    },
    {
      key: "sourcePage",
      label: "Source Page",
      type: "number",
      hint: "Multi-page forms: which page was active when these values were submitted.",
    },
    {
      key: "targetPage",
      label: "Target Page",
      type: "number",
      hint: "Multi-page forms: which page loads next if the current page passes validation.",
    },
  ],
  output: [
    { key: "is_valid", type: "boolean", label: "Whether the submission passed validation" },
    { key: "validation_messages", type: "object", label: "Per-field validation messages" },
    { key: "page_number", type: "number", label: "Page number to display next" },
    { key: "source_page_number", type: "number", label: "Page the values came from" },
    { key: "confirmation_message", type: "string", label: "Confirmation message" },
    { key: "confirmation_type", type: "string", label: "`message` or `redirect`" },
    {
      key: "confirmation_redirect",
      type: "string",
      label: "Redirect URL, when confirmed by redirect",
    },
    { key: "entry_id", type: "number", label: "ID of the created entry" },
    { key: "resume_token", type: "string", label: "Save-and-continue token, when used" },
  ],

  execute(input, ctx) {
    ctx.log("info", "submitting Gravity Forms form", { formId: input.formId });
    const client = GravityFormsClient.fromConnection(ctx);
    const body: Record<string, unknown> = { ...(input.inputValues ?? {}) };
    if (input.fieldValues !== undefined) body.field_values = input.fieldValues;
    if (input.sourcePage !== undefined) body.source_page = input.sourcePage;
    if (input.targetPage !== undefined) body.target_page = input.targetPage;
    return client.request(
      `/forms/${encodeURIComponent(String(input.formId))}/submissions`,
      { method: "POST", body },
    );
  },
};

export default formSubmit;
