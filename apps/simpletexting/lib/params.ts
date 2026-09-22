import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the SimpleTexting actions.
 *
 * Every enum here is copied from the OpenAPI 3.0 document embedded in
 * `https://api-doc.simpletexting.com/` (extracted 2026-09-22), not inferred.
 * Where the vendor's own parameter text and its schema disagree, the schema
 * wins (it is what the server validates) and the disagreement is noted at the
 * param or in the action that uses it.
 */

/**
 * `page` / `size`, shared by all ten list endpoints.
 *
 * Both bounds are the vendor's: `page` starts at `0` (`minimum: 0`, and the
 * document says so in prose — "page numbering starts at zero"), and `size` is
 * `maximum: 500` with a documented default of `50`. The default is repeated
 * here rather than left blank so the form shows what the request will actually
 * ask for.
 */
export function paginationParams(): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Page number, starting at 0. Defaults to 0.",
    },
    {
      key: "size",
      label: "Page size",
      type: "number",
      default: 50,
      validation: { integer: true, min: 1, max: 500 },
      hint: "Rows per page. The vendor's default is 50, and 500 is its maximum.",
    },
  ];
}

/**
 * `mode` — how the message is presented. `enum` from the schema; labels from
 * the field's own description.
 *
 * The description calls `AUTO` "the default value for this field", yet lists
 * `mode` among the request's `required` fields. Both are honoured by defaulting
 * the param to `AUTO`: the field is always sent, so the schema's `required` is
 * satisfied and the documented default is what a caller who does not care gets.
 */
export const modeOptions = [
  { value: "AUTO", label: "Auto — let SimpleTexting pick the type" },
  { value: "SINGLE_SMS_STRICTLY", label: "Single SMS strictly — one SMS or an error" },
  { value: "MMS_PREFERRED", label: "MMS preferred — MMS, falling back to SMS" },
];

export const modeParam: Param = {
  key: "mode",
  label: "Mode",
  type: "select",
  required: true,
  default: "AUTO",
  options: modeOptions,
  hint: "Required by the schema; documented as defaulting to Auto. Auto is sent unless changed.",
};

/** The contact a message is sent to. The schema marks it required. */
export const contactPhoneParam: Param = {
  key: "contactPhone",
  label: "Contact phone",
  type: "string",
  required: true,
  placeholder: "1234567890",
  hint: "The contact's phone number, as stored on the account.",
};

/** The sending number. Blank means the account's primary number. */
export const accountPhoneParam: Param = {
  key: "accountPhone",
  label: "Send from",
  type: "string",
  placeholder: "8005551234",
  hint: "A number on your account. Leave blank to use the primary account number — List Phones " +
    "returns the numbers you can send from.",
};

/**
 * `mediaItems` — media item IDs or public URLs, in one array.
 *
 * Sent verbatim: the schema declares `array` of `string` with no
 * `items` schema, and the field description says both forms are accepted
 * ("List of MMS media URLs for temporal storing or media items IDs"). Media
 * items are managed outside this app — the three media-item endpoints are not
 * part of this build.
 */
export const mediaItemsParam: Param = {
  key: "mediaItems",
  label: "Media items",
  type: "array",
  item: { type: "string", placeholder: "507f1f77bcf86cd799439011" },
  hint: "MMS attachments: media item IDs (hexadecimal) or public image URLs. Leave empty for a " +
    "text-only message.",
};

/**
 * `customFields` — a name/merge-tag keyed object, sent verbatim.
 *
 * The vendor's own description says the property name may be the field's
 * *display name* or its *merge tag without the `%%` delimiters* — i.e.
 * `{"Street address": "1625 N Central Ave"}` and
 * `{"street_address": "1625 N Central Ave"}` are both accepted.
 */
export const customFieldsParam: Param = {
  key: "customFields",
  label: "Custom fields",
  type: "json",
  hint: 'Values keyed by custom field name or merge tag, e.g. {"zipcode": "12345"} or {"Street ' +
    'address": "1625 N Central Ave"}. List Custom Fields returns what the account defines.',
};

/** `listIds` — list IDs *or* names, per the vendor's own field description. */
export const listIdsParam: Param = {
  key: "listIds",
  label: "Lists",
  type: "array",
  item: { type: "string", placeholder: "507f191e810c19729de860ea" },
  hint:
    "List IDs or list names. With List Replacement on (the vendor's default), these replace the " +
    "contact's current membership; turn it off to add without removing.",
};

/** `segmentIds` — segment IDs *or* names. */
export const segmentIdsParam: Param = {
  key: "segmentIds",
  label: "Segments",
  type: "array",
  item: { type: "string", placeholder: "507f191e810c19729de860ea" },
  hint: "Segment IDs or segment names. List Segments returns what the account defines.",
};

/**
 * `upsert`, defaulting to `true` **as the vendor's schema says**.
 *
 * Worth stating out loud rather than leaving blank: with the default on,
 * `PUT /api/contacts/{contactIdOrNumber}` creates the contact when it does not
 * exist, so a typo in a phone number writes a new contact instead of failing.
 */
export const upsertParam: Param = {
  key: "upsert",
  label: "Create if missing (upsert)",
  type: "boolean",
  default: true,
  hint: "The vendor's default is on: an unknown phone number creates a contact. Turn it off to " +
    "require that the contact already exists.",
};

/** `listsReplacement`, defaulting to `true` as the vendor's schema says. */
export const listsReplacementParam: Param = {
  key: "listsReplacement",
  label: "Replace list membership",
  type: "boolean",
  default: true,
  hint: "The vendor's default is on: the contact is REMOVED from lists not named here. Turn it " +
    "off to add to the named lists and keep the existing ones.",
};

/**
 * `direction` on `GET /api/contacts`.
 *
 * The parameter text spells the two values `ASC` / `DESC`, while the schema's
 * `default` and the vendor's own example URL both use lowercase `desc`. The
 * schema declares no enum, so this is a free-text field passed through
 * verbatim rather than a picker that would have to guess which spelling the
 * server accepts.
 */
export const directionParam: Param = {
  key: "direction",
  label: "Sort direction",
  type: "string",
  placeholder: "desc",
  hint: "Results are sorted by the `updated` field, descending by default. The parameter text " +
    "spells the values ASC/DESC; the schema's default and the vendor's example are lowercase.",
};

/** `since` — ISO 8601. The document formats the query parameter as `date-time`. */
export const sinceParam: Param = {
  key: "since",
  label: "Updated since",
  type: "string",
  placeholder: "2021-04-28T23:20:08.489Z",
  hint: "ISO 8601 timestamp. Only rows touched at or after it are returned.",
};

/**
 * `type` on `GET /api/campaigns`.
 *
 * The endpoint's own description adds a default the schema does not state:
 * "By default, if `type` is not specified, only immediate campaigns are
 * returned (scheduled and recurring campaigns will not be included)." `ALL` is
 * therefore worth knowing about — without it, a workflow looking for a
 * scheduled campaign sees an empty list.
 */
export const campaignTypeOptions = [
  { value: "ALL", label: "All — immediate, scheduled and recurring" },
  { value: "IMMEDIATELY", label: "Immediate" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "RECURRING", label: "Recurring" },
  { value: "RECURRING_SCHEDULED", label: "Recurring, scheduled" },
];

/** `state` on `GET /api/campaigns`. */
export const campaignStateOptions = [
  { value: "PAUSED", label: "Paused" },
  { value: "SENDING", label: "Sending" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ERROR", label: "Error — not sent" },
  { value: "MONITORING", label: "Monitoring — contains stop words or malicious links" },
];

/**
 * `triggers` on the webhook endpoints.
 *
 * Eight platform events, from the field's own description. Note that the three
 * report endpoints this API also exposes (`/report/delivery`, `/report/incoming`,
 * `/report/unsubscribe`, unauthenticated) create the *same* kind of webhook for
 * one of these triggers; the authenticated endpoint used here can subscribe to
 * any of the eight in one call.
 */
export const webhookTriggerOptions = [
  { value: "INCOMING_MESSAGE", label: "Incoming message" },
  { value: "OUTGOING_MESSAGE", label: "Outgoing message" },
  { value: "DELIVERY_REPORT", label: "Delivery report" },
  { value: "NON_DELIVERED_REPORT", label: "Non-delivered report" },
  { value: "UNSUBSCRIBE_REPORT", label: "Unsubscribe report" },
  { value: "OPENING_A_CONVERSATION", label: "Opening a conversation" },
  { value: "CLOSING_A_CONVERSATION", label: "Closing a conversation" },
  { value: "CONTACT_PHONE_UPDATE", label: "Contact phone update" },
];

/** `requestPerSecLimit` — `maximum: 25` in the schema. */
export const requestPerSecLimitParam: Param = {
  key: "requestPerSecLimit",
  label: "Max requests per second",
  type: "number",
  validation: { integer: true, min: 1, max: 25 },
  hint: "Rate limit SimpleTexting applies to deliveries to this URL. 25 is the documented maximum.",
};

/**
 * The `SingleContactUpdate` body, shared by Create and Update Contact.
 *
 * One schema, one param list, one `execute` shape — the two endpoints take the
 * identical body, and the only difference is that Create requires a phone
 * number while Update addresses the contact by the path parameter and can leave
 * the number alone.
 */
export function contactBodyParams(contactPhoneRequired = false): Param[] {
  return [
    {
      key: "contactPhone",
      label: "Phone number",
      type: "string",
      required: contactPhoneRequired,
      placeholder: "1234567890",
      hint: contactPhoneRequired
        ? "The contact's phone number. Required here even though the schema marks no field " +
          "required — a contact nothing can be texted to is not addressable anywhere else in " +
          "this API."
        : "Changing the phone number re-keys the contact. Leave blank to keep the current number.",
    },
    {
      key: "firstName",
      label: "First name",
      type: "string",
      hint: "Available as the %%firstname%% merge tag in message text.",
    },
    {
      key: "lastName",
      label: "Last name",
      type: "string",
      hint: "Available as the %%lastname%% merge tag in message text.",
    },
    { key: "email", label: "Email", type: "string" },
    {
      key: "birthday",
      label: "Birthday",
      type: "string",
      placeholder: "1985-05-15",
      hint: "Date only, in yyyy-mm-dd format — the schema documents no time component.",
    },
    customFieldsParam,
    {
      key: "comment",
      label: "Comment",
      type: "string",
      hint: "Notes about the contact, stored on the contact record.",
    },
    listIdsParam,
  ];
}

/**
 * `upsert` / `listsReplacement` on the two contact write endpoints.
 *
 * Both default to `true` in the schema (see `upsertParam` and
 * `listsReplacementParam`), and both are sent explicitly so what the request
 * does matches what the form shows.
 */
export function upsertParams(): Param[] {
  return [upsertParam, listsReplacementParam];
}

// --- path parameters ---------------------------------------------------------

/** `contactIdOrNumber` — phone number preferred, per the vendor. */
export const contactIdParam: Param = {
  key: "contactIdOrNumber",
  label: "Contact",
  type: "string",
  required: true,
  placeholder: "1234567890",
  hint: "The contact's phone number (the vendor's preferred addressing form) or its hexadecimal " +
    "ID.",
};

/** `listIdOrName` — accepted by GET and DELETE of a list. */
export const listIdOrNameParam: Param = {
  key: "listIdOrName",
  label: "List",
  type: "string",
  required: true,
  placeholder: "My First List",
  hint: "List name or its hexadecimal ID.",
};

/** `listId` — accepted by PUT only. */
export const listIdParam: Param = {
  key: "listId",
  label: "List",
  type: "string",
  required: true,
  placeholder: "507f1f77bcf86cd799439011",
  hint: "List ID or name. Update a List Name is the one list endpoint documented with a `listId` " +
    "path parameter; it accepts a name here too, as every list endpoint does.",
};

/** `messageId` — hexadecimal, "in hexadecimal format" in the document. */
export const messageIdParam: Param = {
  key: "messageId",
  label: "Message ID",
  type: "string",
  required: true,
  placeholder: "507f191e810c19729de860ea",
  hint: "Hexadecimal message ID, from List Messages or a Send Message result.",
};

/** `campaignId` — hexadecimal. */
export const campaignIdParam: Param = {
  key: "campaignId",
  label: "Campaign ID",
  type: "string",
  required: true,
  placeholder: "507f1f77bcf86cd799439011",
  hint: "Hexadecimal campaign ID, from List Campaigns or a Send Campaign result.",
};

/** `webhookId` — hexadecimal. */
export const webhookIdParam: Param = {
  key: "webhookId",
  label: "Webhook ID",
  type: "string",
  required: true,
  placeholder: "507f191e810c19729de860ea",
  hint: "Hexadecimal webhook ID, from List Webhooks or a Create Webhook result.",
};
