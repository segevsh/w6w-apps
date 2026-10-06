import type { OutputField, Param } from "@w6w/types";
import { compact, jsonValue, strList } from "./client.ts";

/** Flat person fields shared by the person signup helper, person-update and every record helper. */
export const PERSON_PARAMS: Param[] = [
  {
    key: "email",
    label: "Email",
    type: "string",
    hint: "An email address or a phone is required.",
  },
  {
    key: "phone",
    label: "Mobile phone",
    type: "string",
    hint: "National or international format; stored internationally without the plus sign.",
  },
  { key: "givenName", label: "First name", type: "string" },
  { key: "familyName", label: "Last name", type: "string" },
  { key: "addressLine", label: "Street address", type: "string" },
  { key: "city", label: "City", type: "string" },
  { key: "region", label: "State / region", type: "string", hint: "ISO 3166-2 subdivision code." },
  { key: "postalCode", label: "Postal code", type: "string" },
  {
    key: "country",
    label: "Country",
    type: "string",
    hint:
      "ISO 3166-1 alpha-2. Defaults to US whenever any other address part is sent, so always set it for non-US people.",
  },
  {
    key: "language",
    label: "Language",
    type: "string",
    hint:
      "One language code (en, es, fr, fr-FR, pt-BR, zh, ...). Unknown codes are ignored and the person defaults to English.",
  },
  {
    key: "emailStatus",
    label: "Email status",
    type: "select",
    options: [{ value: "subscribed", label: "Subscribed" }, {
      value: "unsubscribed",
      label: "Unsubscribed",
    }],
    hint:
      "Only subscribed and unsubscribed can be set. Leave empty to keep an existing person's status (a new person is subscribed).",
  },
  {
    key: "phoneStatus",
    label: "Mobile status",
    type: "select",
    options: [{ value: "subscribed", label: "Subscribed" }, {
      value: "unsubscribed",
      label: "Unsubscribed",
    }],
    hint: "A new mobile number is added as unsubscribed unless you pass subscribed.",
  },
  {
    key: "customFields",
    label: "Custom fields",
    type: "json",
    hint:
      'Object of custom field name to string value, e.g. {"I am a parent": "1"}. Names must match a field in the group (see the README).',
  },
];

/** `add_tags` / `remove_tags` — matched to existing tags by NAME; an unknown name is ignored. */
export const TAG_OP_PARAMS: Param[] = [
  {
    key: "addTags",
    label: "Add tags",
    type: "array",
    item: { type: "string" },
    hint:
      "Tag names to add. A name with no existing tag is silently ignored. Applied before removals.",
  },
  {
    key: "removeTags",
    label: "Remove tags",
    type: "array",
    item: { type: "string" },
    hint: "Tag names to remove from the person.",
  },
];

/** Opt-in to the vendor's queue: it answers `{}` immediately and processes later. */
export const BACKGROUND_PARAM: Param = {
  key: "backgroundRequest",
  label: "Process in background",
  type: "boolean",
  hint:
    "Sends background_request=true: the vendor queues the work and answers an empty object at once, so no result comes back.",
};

/** Build the OSDI person hash from the flat fields. Unset fields are never sent. */
export function buildPerson(input: Record<string, unknown>): Record<string, unknown> {
  const person: Record<string, unknown> = compact({
    given_name: input.givenName,
    family_name: input.familyName,
  });
  if (input.email) {
    person.email_addresses = [compact({ address: input.email, status: input.emailStatus })];
  }
  if (input.phone) {
    person.phone_numbers = [compact({ number: input.phone, status: input.phoneStatus })];
  }
  const postal = compact({
    address_lines: input.addressLine ? [input.addressLine] : undefined,
    locality: input.city,
    region: input.region,
    postal_code: input.postalCode,
    country: input.country,
  });
  if (Object.keys(postal).length > 0) person.postal_addresses = [postal];
  if (input.language) person.languages_spoken = [input.language];
  const custom = jsonValue(input.customFields);
  if (custom !== undefined) person.custom_fields = custom;
  return person;
}

/** The helpers all refuse a person with neither an email nor a phone. */
export function requireContact(input: Record<string, unknown>): void {
  if (!input.email && !input.phone) {
    throw new Error("an email or a phone number is required to identify the person");
  }
}

/** Referrer data shared by the record helpers. */
export const REFERRER_PARAMS: Param[] = [
  {
    key: "source",
    label: "Source code",
    type: "string",
    hint: "Equivalent to ?source= on the action's URL; feeds the sources chart.",
  },
  {
    key: "website",
    label: "Referring website",
    type: "string",
  },
  {
    key: "createdDate",
    label: "Created date",
    type: "datetime",
    hint: "Backdates the record (ISO 8601). Defaults to now.",
  },
];

export const AUTORESPONSE_PARAM: Param = {
  key: "sendAutoresponse",
  label: "Send autoresponse",
  type: "boolean",
  hint:
    "Sends the action's autoresponse email. Only actions created in Action Network's own interface have one.",
};

/**
 * Body for a record helper: `{ person, add_tags, remove_tags, triggers, created_date,
 * action_network:referrer_data, ...extra }`. The helper creates or updates the person AND records
 * the action in one call.
 */
export function helperBody(
  input: Record<string, unknown>,
  extra: Record<string, unknown> = {},
  opts: { autoresponse?: boolean } = {},
): Record<string, unknown> {
  requireContact(input);
  const referrer = compact({ source: input.source, website: input.website });
  return compact({
    ...extra,
    created_date: input.createdDate,
    "action_network:referrer_data": Object.keys(referrer).length > 0 ? referrer : undefined,
    person: buildPerson(input),
    add_tags: strList(input.addTags),
    remove_tags: strList(input.removeTags),
    triggers: opts.autoresponse && input.sendAutoresponse !== undefined
      ? { autoresponse: { enabled: Boolean(input.sendAutoresponse) } }
      : undefined,
  });
}

/** Output of a person read or write. */
export const PERSON_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Action Network id (UUID)" },
  { key: "identifiers", type: "array", label: "All identifiers, `system:id`" },
  { key: "given_name", type: "string", label: "First name" },
  { key: "family_name", type: "string", label: "Last name" },
  {
    key: "email_addresses",
    type: "array",
    label: "{ primary, address, status }; status is subscribed, unsubscribed, bouncing, ...",
  },
  { key: "phone_numbers", type: "array", label: "{ primary, number, number_type, status }" },
  { key: "postal_addresses", type: "array", label: "Addresses, geocoded by the vendor" },
  { key: "languages_spoken", type: "array", label: "Language codes" },
  { key: "custom_fields", type: "object", label: "Custom field name to string value" },
  { key: "created_date", type: "string", label: "Created (ISO 8601)" },
  { key: "modified_date", type: "string", label: "Last modified (ISO 8601)" },
];

/** Output of a record (signature, attendance, submission, donation, outreach, tagging). */
export function recordOutput(...extra: OutputField[]): OutputField[] {
  return [
    { key: "id", type: "string", label: "Action Network id (UUID)" },
    { key: "identifiers", type: "array", label: "All identifiers, `system:id`" },
    { key: "action_network:person_id", type: "string", label: "The person's id" },
    ...extra,
    { key: "created_date", type: "string", label: "Created (ISO 8601)" },
    { key: "modified_date", type: "string", label: "Last modified (ISO 8601)" },
  ];
}
