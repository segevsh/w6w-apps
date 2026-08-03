import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  ManychatClient,
  type ManychatEnvelope,
  type ManychatSubscriber,
} from "../lib/client.ts";

interface Input {
  subscriberId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  hasOptInEmail?: boolean;
  hasOptInSms?: boolean;
  consentPhrase?: string;
}

/**
 * Update an existing subscriber's system fields.
 *
 * `POST /fb/subscriber/updateSubscriber` with `{ subscriber_id, … }` →
 * `{ status, data: Subscriber }`.
 *
 * ## Two differences from `createSubscriber` that are easy to miss
 *
 *   1. **There is no `whatsapp_phone`.** `createSubscriber` accepts it as one of
 *      three identities; `updateSubscriber`'s body schema does not list it at
 *      all. So a WhatsApp number can be set at creation and, through this API,
 *      not changed afterwards. That is the spec, not an omission here.
 *   2. **Only `subscriber_id` is genuinely required.** Every other field is
 *      optional, and unset ones are dropped by `compact` rather than sent as
 *      `null` — a partial update must not blank a name nobody touched.
 *
 * This action does **not** touch tags or custom fields; those have their own
 * endpoints (`add-subscriber-tag`, `set-subscriber-field`). "System fields" here
 * means the built-in identity and consent columns.
 *
 * `idempotent: true`. Every field is an absolute write, so replaying the same
 * input converges on the same subscriber state — which is what makes a retry
 * after a network timeout safe.
 */
const updateSubscriber: ActionDefinition<Input> = {
  key: "update-subscriber",
  type: "perform",
  idempotent: true,
  resource: "subscriber",
  title: "Update Subscriber",
  description:
    "Update a subscriber's system fields (POST /fb/subscriber/updateSubscriber). Unset params " +
    "are omitted, never nulled. Manychat publishes no way to change `whatsapp_phone` here.",
  params: [
    { key: "subscriberId", label: "Subscriber ID", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone (SMS)", type: "string" },
    { key: "gender", label: "Gender", type: "string" },
    {
      key: "hasOptInEmail",
      label: "Has opted in to email",
      type: "boolean",
      hint: "Manychat requires this whenever an email is supplied.",
    },
    {
      key: "hasOptInSms",
      label: "Has opted in to SMS",
      type: "boolean",
      hint: "Manychat requires this whenever a phone number is supplied.",
    },
    {
      key: "consentPhrase",
      label: "Consent phrase",
      type: "string",
      hint: "Required by Manychat when SMS opt-in is true.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "data", type: "object", label: "Subscriber" },
  ],

  execute(input, ctx) {
    return new ManychatClient(ctx).post<ManychatEnvelope<ManychatSubscriber>>(
      "/fb/subscriber/updateSubscriber",
      compact({
        subscriber_id: input.subscriberId,
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        phone: input.phone,
        gender: input.gender,
        has_opt_in_email: input.hasOptInEmail,
        has_opt_in_sms: input.hasOptInSms,
        consent_phrase: input.consentPhrase,
      }),
    );
  },
};

export default updateSubscriber;
