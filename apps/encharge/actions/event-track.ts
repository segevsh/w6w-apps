import type { ActionDefinition } from "@w6w/types";
import { EnchargeClient, jsonValue } from "../lib/client.ts";

/**
 * Track Event — `POST https://ingest.encharge.io/v1/`. Verified against the Ingest API page
 * (docs.encharge.io/getting-started/connecting-your-app-to-encharge/ingest-api), fetched
 * 2026-10-06: body `{ name, user, properties, sourceIp }`; `user.email` or `user.userId`
 * identifies the person and any other `user` member becomes a custom person field; `identify`
 * as the event name creates or updates the person only; `user.tags` is a comma-separated string.
 *
 * Authenticated by the account WRITE KEY (a different secret from the API key), which the Auth
 * `sign` hook stamps for this host only. Encharge's own guidance is to use the REST API, not
 * this one, when building an integration for other Encharge customers.
 */
interface Input {
  name: string;
  email?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  tags?: string;
  ip?: string;
  userFields?: unknown;
  properties?: unknown;
  sourceIp?: string;
}

const eventTrack: ActionDefinition<Input> = {
  key: "event-track",
  type: "perform",
  resource: "events",
  title: "Track Event",
  description: "Record an event for a person through the Ingest API, creating or updating the " +
    "person at the same time. Use the event name `identify` to only create or update the person.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Event name",
      type: "string",
      required: true,
      hint: 'e.g. "Created Page". "identify" creates/updates the person without an event.',
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Email or User ID is required to identify the person.",
    },
    { key: "userId", label: "User ID", type: "string" },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      hint: 'Comma-separated tags to add to the person: "tag1, tag2".',
    },
    {
      key: "ip",
      label: "Person IP",
      type: "string",
      hint: "Populates the person's country and timezone.",
    },
    {
      key: "userFields",
      label: "Other person fields (JSON)",
      type: "json",
      hint: 'Custom person fields to set, e.g. {"plan":"Premium"}.',
    },
    {
      key: "properties",
      label: "Event properties (JSON)",
      type: "json",
      hint: 'Properties of this event, e.g. {"page":"Pricing"}. Dates as ISO 8601.',
    },
    { key: "sourceIp", label: "Source IP", type: "string", hint: "IP of the end user, if known." },
  ],
  output: [{ key: "ok", type: "boolean", label: "True when the Ingest API accepted the event" }],

  async execute(input, ctx) {
    const name = (input.name ?? "").trim();
    if (!name) throw new Error("`name` is required.");
    const email = (input.email ?? "").trim();
    const userId = (input.userId ?? "").trim();
    if (!email && !userId) throw new Error("Give `email` or `userId` to identify the person.");

    const extra = jsonValue(input.userFields);
    if (
      extra !== undefined && (typeof extra !== "object" || extra === null || Array.isArray(extra))
    ) {
      throw new Error("`userFields` must be a JSON object.");
    }
    const user: Record<string, unknown> = { ...(extra as Record<string, unknown> ?? {}) };
    if (email) user.email = email;
    if (userId) user.userId = userId;
    if (input.firstName) user.firstName = input.firstName;
    if (input.lastName) user.lastName = input.lastName;
    if (input.tags) user.tags = input.tags;
    if (input.ip) user.ip = input.ip;

    const body: Record<string, unknown> = { name, user };
    const properties = jsonValue(input.properties);
    if (properties !== undefined) body.properties = properties;
    if (input.sourceIp) body.sourceIp = input.sourceIp;
    return await new EnchargeClient(ctx).ingest(body);
  },
};

export default eventTrack;
