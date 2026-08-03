import type { ActionDefinition } from "@w6w/types";
import { compact, jsonObject, KajabiClient } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * `POST /v1/forms/{id}/submit` — submit a Kajabi form from outside Kajabi.
 *
 * ## The one write that triggers Kajabi's own automation
 *
 * This is the bridge between an external lead source and everything a creator
 * has already built inside Kajabi. A form submission is an *event* on the
 * platform: it can start email sequences, apply tags, and grant offers,
 * according to automations the site owner configured in the Kajabi UI. So this
 * action does considerably more than write a record — which is exactly why it
 * is often the right choice over `contact-create`.
 *
 * The trade-off between the two is worth stating plainly:
 *
 *  - **`contact-create`** writes a contact and nothing else happens. Right for
 *    a migration or a back-fill, where firing a year of welcome sequences at
 *    imported addresses would be a serious mistake.
 *  - **`form-submit`** behaves as if the person filled the form in. Right for a
 *    live capture from an external landing page, a webinar signup, or a
 *    partner's form, where the creator's automations *should* run.
 *
 * Kajabi's own help centre lists this as the intended integration path for
 * external forms, and the spec's request schema is `form_submission_attributes`
 * — the same contact-shaped attribute set (`name`, `email`, phone, address,
 * `custom_1`…`custom_3`) minus `subscribed` and `external_user_id`. Neither is
 * offered here, because neither is in the schema.
 *
 * ## Not idempotent, and it cannot be made so
 *
 * Every call is a new submission event. A retried workflow re-fires whatever
 * automation the form drives — potentially a second welcome email to the same
 * person. There is no dedupe key in the schema to key against, so this is
 * declared `idempotent: false` and the runtime will not retry it silently.
 */
interface Input {
  formId: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  businessNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressCity?: string;
  addressState?: string;
  addressCountry?: string;
  addressZip?: string;
  customFields?: string;
}

const formSubmit: ActionDefinition<Input> = {
  key: "form-submit",
  type: "perform",
  resource: "form",
  title: "Submit Form",
  description:
    "Submit a Kajabi form as if a visitor filled it in — firing whatever email sequences, tags " +
    "and offer grants the creator attached to it. Use `contact-create` instead when you want " +
    "the record without the automation.",
  idempotent: false,
  params: [
    {
      key: "formId",
      label: "Form ID",
      type: "string",
      required: true,
      hint: "`form-list` returns the ids.",
    },
    { key: "name", label: "Name", type: "string", row: "who" },
    {
      key: "email",
      label: "Email",
      type: "string",
      row: "who",
      placeholder: "person@example.com",
      hint: "Kajabi's schema marks no field required, but a submission without an email has " +
        "nothing to attach to a contact.",
    },
    { key: "phoneNumber", label: "Phone number", type: "string", row: "phone" },
    { key: "businessNumber", label: "Business number", type: "string", row: "phone" },
    { key: "addressLine1", label: "Address line 1", type: "string", advanced: true },
    { key: "addressLine2", label: "Address line 2", type: "string", advanced: true },
    { key: "addressCity", label: "City", type: "string", advanced: true, row: "city" },
    { key: "addressState", label: "State", type: "string", advanced: true, row: "city" },
    { key: "addressCountry", label: "Country", type: "string", advanced: true, row: "geo" },
    { key: "addressZip", label: "Postal code", type: "string", advanced: true, row: "geo" },
    {
      key: "customFields",
      label: "Custom fields",
      type: "string",
      ui: "textarea",
      advanced: true,
      placeholder: '{"custom_1": "Webinar signup"}',
      hint: "JSON object over `custom_1`…`custom_3`. `custom-field-list` shows the site's " +
        "definitions.",
    },
  ],
  output: resourceOutput,

  execute(input, ctx) {
    const attributes = compact({
      name: input.name,
      email: input.email,
      phone_number: input.phoneNumber,
      business_number: input.businessNumber,
      address_line_1: input.addressLine1,
      address_line_2: input.addressLine2,
      address_city: input.addressCity,
      address_state: input.addressState,
      address_country: input.addressCountry,
      address_zip: input.addressZip,
      ...(jsonObject(input.customFields, "Custom fields") ?? {}),
    });

    return new KajabiClient(ctx).request(
      `/forms/${encodeURIComponent(input.formId)}/submit`,
      { method: "POST", body: { data: { type: "form_submissions", attributes } } },
    );
  },
};

export default formSubmit;
