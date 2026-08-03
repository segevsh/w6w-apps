import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  ManychatClient,
  type ManychatEnvelope,
  type ManychatSubscriber,
} from "../lib/client.ts";

interface Input {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  whatsappPhone?: string;
  gender?: string;
  hasOptInEmail?: boolean;
  hasOptInSms?: boolean;
  consentPhrase?: string;
}

/**
 * Create a subscriber from an identity you already hold.
 *
 * `POST /fb/subscriber/createSubscriber` → `{ status, data: Subscriber }`.
 *
 * ## This does not create a Messenger or Instagram contact
 *
 * Worth being blunt about, because the action name invites the wrong assumption.
 * The body schema's three identity fields are `email`, `phone` and
 * `whatsapp_phone` — there is no `psid`, no `ig_id`, no Messenger handle.
 * Messenger and Instagram subscribers come into existence when a person messages
 * the Page or taps a Growth Tool; they cannot be conjured from an API call,
 * because Meta does not let a business initiate. So this endpoint is for the
 * email/SMS/WhatsApp side of a Manychat audience — importing a customer list,
 * or promoting a checkout into a WhatsApp contact.
 *
 * ## The conditional requirements are real and they are consent rules
 *
 * The spec states four, and every one of them exists because sending to someone
 * who did not agree is a legal problem, not a validation problem:
 *
 *     phone           "required if Email and Whatsapp Phone properties are empty"
 *     whatsapp_phone  "required if Email and Phone Number properties are empty"
 *     email           "required if Phone Number and Whatsapp Phone are empty"
 *     has_opt_in_sms  "required if property Phone Number is not empty"
 *     has_opt_in_email "required if property Email is not empty"
 *     consent_phrase  "required if property `has_opt_in_sms` equal true"
 *
 * The first three collapse to one rule — **at least one of email, phone or
 * whatsappPhone** — which is checked here, because sending a body with no
 * identity at all is a guaranteed round trip to a 400. The opt-in and consent
 * rules are *not* enforced here: `has_opt_in_sms` is a claim about what a human
 * agreed to, `consent_phrase` is the wording they agreed to, and a client-side
 * check that waves those through when the shape looks right would be worse than
 * letting Manychat — which owns the compliance posture — reject them. They are
 * surfaced as params with hints saying exactly when the vendor requires them.
 *
 * `idempotent: false`. Two calls with the same email are not documented to
 * de-duplicate, and a replay that creates a second subscriber is a real cost.
 * When the intent is upsert, `find-subscriber-by-system-field` first, then
 * `update-subscriber`.
 */
const createSubscriber: ActionDefinition<Input> = {
  key: "create-subscriber",
  type: "perform",
  idempotent: false,
  resource: "subscriber",
  title: "Create Subscriber",
  description: "Create a subscriber from an email, phone or WhatsApp number " +
    "(POST /fb/subscriber/createSubscriber). Cannot create Messenger or Instagram contacts — " +
    "those only exist once the person messages the Page.",
  params: [
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "At least one of email, phone or WhatsApp phone is required.",
    },
    { key: "phone", label: "Phone (SMS)", type: "string" },
    { key: "whatsappPhone", label: "WhatsApp phone", type: "string" },
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
      hint: "Required by Manychat when SMS opt-in is true — the wording the person agreed to.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "Status" },
    { key: "data", type: "object", label: "Subscriber" },
  ],

  execute(input, ctx) {
    if (!input.email && !input.phone && !input.whatsappPhone) {
      throw new Error(
        "create-subscriber needs at least one identity: email, phone or whatsappPhone.",
      );
    }

    return new ManychatClient(ctx).post<ManychatEnvelope<ManychatSubscriber>>(
      "/fb/subscriber/createSubscriber",
      compact({
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        phone: input.phone,
        whatsapp_phone: input.whatsappPhone,
        gender: input.gender,
        has_opt_in_email: input.hasOptInEmail,
        has_opt_in_sms: input.hasOptInSms,
        consent_phrase: input.consentPhrase,
      }),
    );
  },
};

export default createSubscriber;
