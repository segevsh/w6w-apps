import type { ActionDefinition } from "@w6w/types";
import { compact, DemioClient } from "../lib/client.ts";

interface Input {
  eventId?: number;
  refUrl?: string;
  dateId?: number;
  name: string;
  email: string;
  lastName?: string;
  company?: string;
  website?: string;
  phoneNumber?: string;
  gdpr?: string;
  customFields?: Record<string, unknown>;
}

const eventRegister: ActionDefinition<Input> = {
  key: "event-register",
  type: "perform",
  resource: "registrant",
  title: "Register Person",
  description: "Register someone for an event and get back their unique join link. Identify the " +
    "event by ID or by its registration page URL; without a session ID Demio uses the nearest " +
    "active session.",
  idempotent: false,
  params: [
    { key: "eventId", label: "Event ID", type: "number", hint: "Required unless a URL is given." },
    {
      key: "refUrl",
      label: "Registration page URL",
      type: "string",
      hint: "Use when you know the event link but not its ID.",
    },
    { key: "dateId", label: "Session (date) ID", type: "number" },
    { key: "name", label: "First name", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "company", label: "Company", type: "string" },
    { key: "website", label: "Website", type: "string" },
    { key: "phoneNumber", label: "Phone number", type: "string" },
    { key: "gdpr", label: "GDPR field value", type: "string" },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      hint: 'Object of custom field identifier to value, e.g. {"job_title": "CTO"}. The ' +
        "identifier is shown in the event's Registration block, Customize tab.",
    },
  ],
  output: [
    { key: "hash", type: "string", label: "Attendee hash" },
    { key: "join_link", type: "string", label: "Join link" },
  ],

  async execute(input, ctx) {
    if (input.eventId === undefined && !input.refUrl) {
      throw new Error("Demio register needs an Event ID or a registration page URL");
    }
    return await new DemioClient(ctx).request("/event/register", {
      method: "PUT",
      body: {
        // custom fields first, so a named field can never be shadowed by a custom key
        ...(input.customFields ?? {}),
        ...compact({
          id: input.eventId,
          ref_url: input.refUrl,
          date_id: input.dateId,
          name: input.name,
          email: input.email,
          last_name: input.lastName,
          company: input.company,
          website: input.website,
          phone_number: input.phoneNumber,
          gdpr: input.gdpr,
        }),
      },
    });
  },
};

export default eventRegister;
