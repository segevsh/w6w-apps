import type { ActionDefinition } from "@w6w/types";
import { compact, IClosedClient } from "../lib/client.ts";

/**
 * `POST /v1/contacts` — Create a contact.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  status?: string;
  tag?: string;
  joinedTime?: string;
  linkPrefix?: string;
  utm?: string;
  country?: string;
  timeZone?: string;
  ipAddress?: string;
  referrerUrl?: string;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create contact",
  description: "Create a contact.",
  idempotent: false,
  params: [
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
      key: "email",
      label: "Email",
      type: "string",
    },
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
      hint: "E.164 format, e.g. +15551234567.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "POTENTIAL", label: "Potential" }, {
        value: "QUALIFIED",
        label: "Qualified",
      }, { value: "DISQUALIFIED", label: "Disqualified" }],
    },
    {
      key: "tag",
      label: "Tag",
      type: "string",
    },
    {
      key: "joinedTime",
      label: "Joined time",
      type: "string",
      hint: "ISO 8601 date-time.",
    },
    {
      key: "linkPrefix",
      label: "Event link prefix",
      type: "string",
      hint: "username/event-name",
    },
    {
      key: "utm",
      label: "UTM",
      type: "string",
    },
    {
      key: "country",
      label: "Country",
      type: "string",
    },
    {
      key: "timeZone",
      label: "Time zone",
      type: "string",
      hint: "IANA time zone.",
    },
    {
      key: "ipAddress",
      label: "IP address",
      type: "string",
    },
    {
      key: "referrerUrl",
      label: "Referrer URL",
      type: "string",
    },
  ],
  output: [
    { key: "data", type: "object", label: "{contact}" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/contacts", {
      method: "POST",
      body: compact({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phoneNumber: input.phoneNumber,
        status: input.status,
        tag: input.tag,
        joinedTime: input.joinedTime,
        linkPrefix: input.linkPrefix,
        utm: input.utm,
        country: input.country,
        timeZone: input.timeZone,
        ipAddress: input.ipAddress,
        referrerUrl: input.referrerUrl,
      }),
    });
  },
};

export default contactCreate;
