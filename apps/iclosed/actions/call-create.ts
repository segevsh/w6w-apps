import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, IClosedClient } from "../lib/client.ts";

/**
 * `POST /v1/eventCalls` — Book a call. Resolve a free slot first with Get event dates.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  dateTime: string;
  timeZone: string;
  secondaryQuestionsAnswer: unknown;
  contactId?: number;
  email?: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  eventId?: number;
  linkPrefix?: string;
  conditionalUsers?: string;
  routingGroupIds?: string;
  useSecondaryQuestionsForConditionalRouting?: boolean;
  additionalGuests?: unknown;
}

const callCreate: ActionDefinition<Input> = {
  key: "call-create",
  type: "perform",
  resource: "call",
  title: "Book call",
  description: "Book a call. Resolve a free slot first with Get event dates.",
  idempotent: false,
  params: [
    {
      key: "dateTime",
      label: "Date and time",
      type: "string",
      required: true,
      hint: "ISO 8601 date-time of the slot.",
    },
    {
      key: "timeZone",
      label: "Time zone",
      type: "string",
      required: true,
      hint: "IANA time zone.",
    },
    {
      key: "secondaryQuestionsAnswer",
      label: "Secondary question answers",
      type: "json",
      required: true,
      hint: 'JSON array of {"customFieldId" or "identifier","answer":[...]}; may be [].',
    },
    {
      key: "contactId",
      label: "Contact ID",
      type: "number",
      validation: { integer: true },
    },
    {
      key: "email",
      label: "Email",
      type: "string",
    },
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
    },
    {
      key: "firstName",
      label: "First name",
      type: "string",
    },
    {
      key: "lastName",
      label: "Last name",
      type: "string",
    },
    {
      key: "eventId",
      label: "Event ID",
      type: "number",
      validation: { integer: true },
      hint: "Give this or Link prefix.",
    },
    {
      key: "linkPrefix",
      label: "Event link prefix",
      type: "string",
      hint: "username/event-name",
    },
    {
      key: "conditionalUsers",
      label: "Conditional users",
      type: "string",
    },
    {
      key: "routingGroupIds",
      label: "Routing group IDs",
      type: "string",
    },
    {
      key: "useSecondaryQuestionsForConditionalRouting",
      label: "Use secondary answers for routing",
      type: "boolean",
    },
    {
      key: "additionalGuests",
      label: "Additional guests",
      type: "json",
      hint: 'JSON array of {"email","name"}.',
    },
  ],
  output: [
    { key: "data", type: "object", label: "{eventCall} with the booking confirmation" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/eventCalls", {
      method: "POST",
      body: compact({
        dateTime: input.dateTime,
        timeZone: input.timeZone,
        secondaryQuestionsAnswer: asOptionalJson(
          input.secondaryQuestionsAnswer,
          "Secondary question answers",
        ),
        contactId: input.contactId,
        email: input.email,
        phoneNumber: input.phoneNumber,
        firstName: input.firstName,
        lastName: input.lastName,
        eventId: input.eventId,
        linkPrefix: input.linkPrefix,
        conditionalUsers: input.conditionalUsers,
        routingGroupIds: input.routingGroupIds,
        useSecondaryQuestionsForConditionalRouting:
          input.useSecondaryQuestionsForConditionalRouting,
        additionalGuests: asOptionalJson(input.additionalGuests, "Additional guests"),
      }),
    });
  },
};

export default callCreate;
