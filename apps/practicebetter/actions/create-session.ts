import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, PracticeBetterClient } from "../lib/client.ts";

/**
 * `POST /consultant/sessions` — book a session.
 *
 * Security: `[read, write]`. Body schema: `ClientSessionCreateFragment`, whose
 * required fields are `clientRecordId`, `duration` (minutes), `serviceId`,
 * `serviceType` and `sessionDate`.
 *
 * ## The two fields that surprise callers
 *
 * 1. **`serviceType` is one of `face`, `phone` or `virtual`** — the values the
 *    document declares. When it is `virtual`, the document says
 *    `telehealthSettings.launchApplication` must also be set, so the action's
 *    hint repeats that rather than letting the API refuse the booking.
 * 2. **`timeZone` is a vendor time-zone name**, not an IANA string you would
 *    guess: the document points at the time-zone list for the value to use, and
 *    `list-timezones` is that list.
 *
 * `409` is a scheduling conflict — a double-booking, or a slot the consultant
 * is not available for — unless `ignoreConflict` is on. It is surfaced as a
 * normal failure so a workflow does not treat a refused booking as made
 * (a `202` "accepted" response is a success in this API).
 *
 * Not idempotent: booking twice books two sessions.
 */
interface Input {
  clientRecordId: string;
  duration: number;
  serviceId: string;
  serviceType: string;
  sessionDate: string;
  asConsultantId?: string;
  fee?: unknown;
  location?: unknown;
  notes?: string;
  notify?: boolean;
  markConfirmed?: boolean;
  ignoreConflict?: boolean;
  timeZone?: string;
  telehealthSettings?: unknown;
  notificationOptions?: unknown;
  buffer?: unknown;
}

const createSession: ActionDefinition<Input, Record<string, unknown>> = {
  key: "create-session",
  type: "perform",
  resource: "session",
  title: "Book Session",
  description: "Book a session for a client record. Returns 409 on a scheduling conflict unless " +
    "`ignoreConflict` is set.",
  idempotent: false,
  params: [
    {
      key: "clientRecordId",
      label: "Client record ID",
      type: "string",
      required: true,
      hint: "The record the session is for — the id `list-client-records` returns.",
    },
    {
      key: "duration",
      label: "Duration (minutes)",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "Session length in minutes.",
    },
    {
      key: "serviceId",
      label: "Service ID",
      type: "string",
      required: true,
      hint: "The bookable service — the id `list-services` returns.",
    },
    {
      key: "serviceType",
      label: "Service type",
      type: "select",
      required: true,
      options: [
        { value: "face", label: "In person" },
        { value: "phone", label: "Phone" },
        { value: "virtual", label: "Virtual" },
      ],
      hint: "The document declares exactly `face`, `phone` and `virtual`. For `virtual`, " +
        "`telehealthSettings.launchApplication` must also be set.",
    },
    {
      key: "sessionDate",
      label: "Session date",
      type: "datetime",
      required: true,
      hint: "When the session starts (date-time).",
    },
    {
      key: "asConsultantId",
      label: "Book as consultant ID",
      type: "string",
      hint: "Book on behalf of this consultant, where the caller may act for several.",
    },
    {
      key: "fee",
      label: "Fee",
      type: "json",
      hint:
        "A `Money` object (the document types this field as `Money`), overriding the service's fee.",
    },
    {
      key: "location",
      label: "Location",
      type: "json",
      hint: "An `OfficeLocation` object for an in-person session.",
    },
    {
      key: "notes",
      label: "Notes",
      type: "text",
      hint: "Notes attached to the booking.",
    },
    {
      key: "notify",
      label: "Notify the client",
      type: "boolean",
      hint: "Send the client their booking notification.",
    },
    {
      key: "markConfirmed",
      label: "Mark confirmed",
      type: "boolean",
      hint: "Book the session with its confirmation status already confirmed.",
    },
    {
      key: "ignoreConflict",
      label: "Ignore conflicts",
      type: "boolean",
      hint:
        "Book even if the slot conflicts with the consultant's availability. Off means a conflict " +
        "answers 409 instead.",
    },
    {
      key: "timeZone",
      label: "Time zone",
      type: "string",
      placeholder: "America/New_York",
      hint:
        "The vendor's time-zone name. Use `list-timezones` — its `name` field is documented as the " +
        "value to use wherever a time zone is expected.",
    },
    {
      key: "telehealthSettings",
      label: "Telehealth settings",
      type: "json",
      hint: "Required when `serviceType` is `virtual`: `launchApplication` must be set.",
    },
    {
      key: "notificationOptions",
      label: "Notification options",
      type: "json",
      hint: "Per-booking notification choices. The document types this as an object without " +
        "publishing its keys.",
    },
    {
      key: "buffer",
      label: "Buffer",
      type: "json",
      hint: "Buffer time around the booking. The document types this as an object without " +
        "publishing its keys.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Session ID" },
    { key: "clientRecord", type: "object", label: "The client record it was booked for" },
    { key: "consultant", type: "object", label: "The consultant delivering it" },
    { key: "sessionDate", type: "string", label: "Start time" },
    { key: "duration", type: "number", label: "Duration in minutes" },
    { key: "confirmationStatus", type: "string", label: "Confirmation status" },
    { key: "location", type: "object", label: "Office location, for an in-person session" },
  ],

  execute(input, ctx) {
    return new PracticeBetterClient(ctx).request<Record<string, unknown>>("/consultant/sessions", {
      method: "POST",
      body: {
        clientRecordId: input.clientRecordId,
        duration: input.duration,
        serviceId: input.serviceId,
        serviceType: input.serviceType,
        sessionDate: input.sessionDate,
        asConsultantId: input.asConsultantId,
        fee: asOptionalJson<Record<string, unknown>>(input.fee, "fee"),
        location: asOptionalJson<Record<string, unknown>>(input.location, "location"),
        notes: input.notes,
        notify: input.notify,
        markConfirmed: input.markConfirmed,
        ignoreConflict: input.ignoreConflict,
        timeZone: input.timeZone,
        telehealthSettings: asOptionalJson<Record<string, unknown>>(
          input.telehealthSettings,
          "telehealthSettings",
        ),
        notificationOptions: asOptionalJson<Record<string, unknown>>(
          input.notificationOptions,
          "notificationOptions",
        ),
        buffer: asOptionalJson<Record<string, unknown>>(input.buffer, "buffer"),
      },
    });
  },
};

export default createSession;
