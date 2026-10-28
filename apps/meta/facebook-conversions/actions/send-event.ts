import type { ActionDefinition, Param } from "@w6w/types";
import {
  asJsonValue,
  ConversionsClient,
  type ConversionsResponse,
  datasetFromConnection,
} from "../lib/client.ts";
import { type HashingMode, prepareEvent, type ServerEvent } from "../lib/user-data.ts";

interface UserDataInput {
  email?: string | string[];
  phone?: string | string[];
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  externalId?: string | string[];
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbc?: string;
  fbp?: string;
  subscriptionId?: string;
  leadId?: string;
}

interface Input {
  datasetId?: string;
  eventName: string;
  eventTime?: number;
  actionSource?: string;
  eventSourceUrl?: string;
  eventId?: string;
  userData?: UserDataInput;
  userDataExtra?: unknown;
  value?: number;
  currency?: string;
  customData?: unknown;
  hashing?: HashingMode;
  testEventCode?: string;
  optOut?: boolean;
  dataProcessingOptions?: string;
  dataProcessingOptionsCountry?: number;
  dataProcessingOptionsState?: number;
}

/**
 * Friendly param key → the wire key Meta documents under
 * `user_data`. Keeping the two apart means the form can read like a form while
 * `lib/user-data.ts` still keys its hashing rules off Meta's own names.
 */
const USER_DATA_KEYS: Record<keyof UserDataInput, string> = {
  email: "em",
  phone: "ph",
  firstName: "fn",
  lastName: "ln",
  dateOfBirth: "db",
  gender: "ge",
  city: "ct",
  state: "st",
  zip: "zp",
  country: "country",
  externalId: "external_id",
  clientIpAddress: "client_ip_address",
  clientUserAgent: "client_user_agent",
  fbc: "fbc",
  fbp: "fbp",
  subscriptionId: "subscription_id",
  leadId: "lead_id",
};

/**
 * `action_source` is required and closed-vocabulary, so it is a `select`. The
 * list is Meta's, verbatim.
 */
const ACTION_SOURCES = [
  { value: "website", label: "Website" },
  { value: "app", label: "App" },
  { value: "email", label: "Email" },
  { value: "phone_call", label: "Phone call" },
  { value: "chat", label: "Chat" },
  { value: "physical_store", label: "Physical store" },
  { value: "system_generated", label: "System generated" },
  { value: "business_messaging", label: "Business messaging" },
  { value: "other", label: "Other" },
];

const userDataChildren: Param[] = [
  {
    key: "email",
    label: "Email",
    type: "string",
    repeat: true,
    hint: "Raw or already-SHA-256. Normalised to lowercase + trimmed, then hashed.",
  },
  {
    key: "phone",
    label: "Phone",
    type: "string",
    repeat: true,
    hint:
      "Include the country code. Symbols are stripped and a leading + or 00 removed before hashing; a national-format number is rejected.",
  },
  { key: "firstName", label: "First name", type: "string", row: "name" },
  { key: "lastName", label: "Last name", type: "string", row: "name" },
  {
    key: "dateOfBirth",
    label: "Date of birth",
    type: "string",
    placeholder: "19850412",
    hint: "YYYYMMDD. Punctuation is stripped before hashing.",
  },
  {
    key: "gender",
    label: "Gender",
    type: "select",
    options: [
      { value: "f", label: "Female" },
      { value: "m", label: "Male" },
    ],
    hint: "Meta accepts only the lowercase initial f or m.",
  },
  { key: "city", label: "City", type: "string", row: "place" },
  {
    key: "state",
    label: "State",
    type: "string",
    row: "place",
    hint: "2-character ANSI abbreviation for the US, lowercase.",
  },
  { key: "zip", label: "Postal code", type: "string", row: "place" },
  {
    key: "country",
    label: "Country",
    type: "string",
    placeholder: "us",
    hint: "ISO 3166-1 alpha-2, lowercase.",
  },
  {
    key: "externalId",
    label: "External ID",
    type: "string",
    repeat: true,
    hint:
      "Your own user/loyalty/cookie id. Sent VERBATIM — Meta's Business SDK does not hash it, and it must match the format your other channels send.",
  },
  {
    key: "clientIpAddress",
    label: "Client IP address",
    type: "string",
    hint: "Never hashed — Meta needs the real address. Hashing it is rejected.",
  },
  { key: "clientUserAgent", label: "Client user agent", type: "string", hint: "Never hashed." },
  {
    key: "fbc",
    label: "Click ID (fbc)",
    type: "string",
    hint: "fb.${subdomain_index}.${creation_time}.${fbclid}. Never hashed.",
  },
  {
    key: "fbp",
    label: "Browser ID (fbp)",
    type: "string",
    hint: "fb.${subdomain_index}.${creation_time}.${random_number}. Never hashed.",
  },
  { key: "subscriptionId", label: "Subscription ID", type: "string", advanced: true },
  {
    key: "leadId",
    label: "Lead ID",
    type: "string",
    advanced: true,
    hint: "The leadgen id from a Meta Lead Ad — see the facebook-lead-ads app.",
  },
];

/**
 * Send one server-side conversion event — `POST /{dataset-id}/events`.
 *
 * This is the Conversions API. There is one write endpoint and this action is
 * the ergonomic form of it: a flat form per event, with `user_data` normalised
 * and SHA-256 hashed on the way out (see `lib/user-data.ts`, and README.md's
 * "How customer data is hashed" for why that choice was made). `send-events`
 * is the same endpoint taking a raw batch.
 *
 * `idempotent: true`, honestly: Meta deduplicates on the pair
 * (`event_name`, `event_id`), and `event_id` defaults to
 * `ctx.invocation.invocationId` — so a retried invocation resolves to the same
 * event rather than a second conversion. A caller who supplies their own
 * `event_id` (the right move when a browser Pixel fires the same event) keeps
 * that property.
 */
const sendEvent: ActionDefinition<Input, ConversionsResponse> = {
  key: "send-event",
  type: "perform",
  resource: "event",
  title: "Send Conversion Event",
  description:
    "Send one server-side event to a Meta dataset. Customer data is normalised and SHA-256 hashed before it leaves this app.",
  idempotent: true,
  params: [
    {
      key: "datasetId",
      label: "Dataset (Pixel) ID",
      type: "string",
      hint: "Defaults to the dataset stored on the connection. Required for OAuth connections.",
    },
    {
      key: "eventName",
      label: "Event Name",
      type: "string",
      required: true,
      placeholder: "Purchase",
      hint:
        "A Meta standard event (Purchase, Lead, CompleteRegistration, AddToCart, InitiateCheckout, ViewContent, Search, Contact, Subscribe, StartTrial, Schedule, Donate, FindLocation, AddPaymentInfo, AddToWishlist, CustomizeProduct, SubmitApplication) or your own custom event name.",
    },
    {
      key: "actionSource",
      label: "Action Source",
      type: "select",
      required: true,
      default: "website",
      options: ACTION_SOURCES,
      hint: "Where the conversion happened. Required on every event.",
    },
    {
      key: "eventTime",
      label: "Event Time",
      type: "number",
      hint:
        "Unix seconds (UTC). Defaults to now. May be up to 7 days in the past; physical-store transactions should be uploaded within 62 days.",
    },
    {
      key: "eventSourceUrl",
      label: "Event Source URL",
      type: "string",
      hint: "The page URL the conversion happened on. Required for website events.",
    },
    {
      key: "eventId",
      label: "Event ID",
      type: "string",
      hint:
        "Deduplication key, paired with the event name. Defaults to this invocation's id; set it to the browser Pixel's eventID when both fire for the same conversion.",
    },
    {
      key: "userData",
      label: "Customer Information",
      type: "group",
      children: userDataChildren,
      hint: "At least one identifier is required. Contact fields are hashed before transmission.",
    },
    {
      key: "value",
      label: "Value",
      type: "number",
      row: "money",
      hint: "Monetary amount. Required for Purchase.",
    },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      row: "money",
      placeholder: "usd",
      hint: "ISO 4217. Required for Purchase.",
    },
    {
      key: "customData",
      label: "Custom Data",
      type: "json",
      hint:
        "Extra business data merged with Value/Currency — content_ids, contents, content_type, content_name, content_category, order_id, num_items, search_string, status, predicted_ltv, delivery_category.",
    },
    {
      key: "hashing",
      label: "Hashing",
      type: "select",
      default: "auto",
      options: [
        { value: "auto", label: "Automatic — normalise and hash raw values" },
        { value: "pre-hashed", label: "Pre-hashed — reject anything not already SHA-256" },
      ],
      hint:
        "Automatic follows Meta's own SDK: an existing SHA-256 digest passes through untouched, anything else is normalised and hashed. Pre-hashed refuses raw values outright.",
    },
    {
      key: "userDataExtra",
      label: "Additional Customer Information",
      type: "json",
      advanced: true,
      hint:
        "Raw Meta user_data keys not on the form above — madid, anon_id, page_id, page_scoped_user_id, ctwa_clid, ig_account_id, ig_sid, fb_login_id. Merged last.",
    },
    {
      key: "testEventCode",
      label: "Test Event Code",
      type: "string",
      advanced: true,
      hint:
        "From Events Manager → Test Events. Routes the event to the test view instead of production. Remove before going live.",
    },
    {
      key: "optOut",
      label: "Opt Out",
      type: "boolean",
      advanced: true,
      hint: "True means use the event for attribution only, never for ad optimisation.",
    },
    {
      key: "dataProcessingOptions",
      label: "Data Processing Options",
      type: "string",
      advanced: true,
      placeholder: "LDU",
      hint: "Comma-separated. LDU enables Limited Data Use.",
    },
    {
      key: "dataProcessingOptionsCountry",
      label: "Data Processing Country",
      type: "number",
      advanced: true,
      hint: "Required when Data Processing Options is set. 1 = USA, 0 = let Meta geolocate.",
    },
    {
      key: "dataProcessingOptionsState",
      label: "Data Processing State",
      type: "number",
      advanced: true,
      hint: "1000 = California, 0 = let Meta geolocate.",
    },
  ],
  output: [
    { key: "events_received", type: "number", label: "Events received" },
    { key: "messages", type: "array", label: "Warnings" },
    { key: "fbtrace_id", type: "string", label: "Trace ID" },
  ],

  async execute(input, ctx) {
    const datasetId = datasetFromConnection(ctx.connection, input.datasetId);

    const userData: Record<string, unknown> = {};
    for (const [formKey, wireKey] of Object.entries(USER_DATA_KEYS)) {
      const value = (input.userData ?? {})[formKey as keyof UserDataInput];
      if (value === undefined || value === null || value === "") continue;
      userData[wireKey] = value;
    }
    const extra = asJsonValue(input.userDataExtra, "Additional Customer Information");
    if (extra && typeof extra === "object" && !Array.isArray(extra)) {
      Object.assign(userData, extra as Record<string, unknown>);
    }

    const customData: Record<string, unknown> = {};
    const declaredCustom = asJsonValue(input.customData, "Custom Data");
    if (declaredCustom && typeof declaredCustom === "object" && !Array.isArray(declaredCustom)) {
      Object.assign(customData, declaredCustom as Record<string, unknown>);
    }
    if (input.value !== undefined && input.value !== null) customData.value = input.value;
    if (input.currency) customData.currency = input.currency;

    const draft: Record<string, unknown> = {
      event_name: input.eventName,
      event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
      action_source: input.actionSource ?? "website",
      event_id: input.eventId || ctx.invocation?.invocationId,
      event_source_url: input.eventSourceUrl,
      opt_out: input.optOut,
      user_data: userData,
    };
    if (Object.keys(customData).length > 0) draft.custom_data = customData;
    if (input.dataProcessingOptions) {
      draft.data_processing_options = input.dataProcessingOptions
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (input.dataProcessingOptionsCountry !== undefined) {
      draft.data_processing_options_country = input.dataProcessingOptionsCountry;
    }
    if (input.dataProcessingOptionsState !== undefined) {
      draft.data_processing_options_state = input.dataProcessingOptionsState;
    }
    for (const key of Object.keys(draft)) {
      if (draft[key] === undefined || draft[key] === null) delete draft[key];
    }

    // Throws before any request is made if a contact field is raw and the
    // caller asked for pre-hashed, or if a value cannot be normalised at all.
    const event: ServerEvent = await prepareEvent(draft, input.hashing ?? "auto");

    ctx.log("info", "sending conversion event", {
      dataset: datasetId,
      event_name: event.event_name,
      identifiers: Object.keys(event.user_data),
    });

    const body: Record<string, unknown> = { data: [event] };
    if (input.testEventCode) body.test_event_code = input.testEventCode;

    const client = new ConversionsClient(ctx);
    return await client.request<ConversionsResponse>(`/${datasetId}/events`, {
      method: "POST",
      body,
    });
  },
};

export default sendEvent;
