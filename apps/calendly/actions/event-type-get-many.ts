import type { ActionDefinition } from "@w6w/types";
import { CalendlyClient } from "../lib/client.ts";

interface Input {
  user?: string;
  organization?: string;
  active?: boolean;
  count?: number;
  pageToken?: string;
}

/**
 * GET /event_types — the event types (meeting templates) owned by a user or
 * organization. Calendly requires exactly one of `user` or `organization` as a
 * URI, so both are offered here and at least one must be supplied.
 */
const eventTypeGetMany: ActionDefinition<Input> = {
  key: "event-type-get-many",
  type: "read",
  resource: "event-type",
  title: "List Event Types",
  description:
    "List event types for a user or organization (GET /event_types). Supply one of `user` or `organization`.",
  params: [
    {
      key: "user",
      label: "User URI",
      type: "string",
      hint: "e.g. https://api.calendly.com/users/AAAA. Required unless Organization is set.",
    },
    {
      key: "organization",
      label: "Organization URI",
      type: "string",
      hint: "e.g. https://api.calendly.com/organizations/BBBB. Required unless User is set.",
    },
    { key: "active", label: "Active only", type: "boolean" },
    {
      key: "count",
      label: "Count",
      type: "number",
      hint: "Rows per page (1–100, default 20).",
      validation: { min: 1, max: 100, integer: true },
    },
    { key: "pageToken", label: "Page token", type: "string", advanced: true },
  ],
  output: [
    { key: "collection", type: "array", label: "Event types" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    return new CalendlyClient(ctx).request("/event_types", {
      query: {
        user: input.user,
        organization: input.organization,
        active: input.active,
        count: input.count,
        page_token: input.pageToken,
      },
    });
  },
};

export default eventTypeGetMany;
