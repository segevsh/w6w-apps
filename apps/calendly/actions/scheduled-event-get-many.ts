import type { ActionDefinition } from "@w6w/types";
import { CalendlyClient } from "../lib/client.ts";

interface Input {
  user?: string;
  organization?: string;
  status?: "active" | "canceled";
  inviteeEmail?: string;
  minStartTime?: string;
  maxStartTime?: string;
  count?: number;
  pageToken?: string;
}

/**
 * GET /scheduled_events — booked meetings. Calendly requires a scope URI: either
 * `organization` (all events in the org) or `user` (one member's events); at
 * least one must be supplied.
 */
const scheduledEventGetMany: ActionDefinition<Input> = {
  key: "scheduled-event-get-many",
  type: "read",
  resource: "scheduled-event",
  title: "List Scheduled Events",
  description:
    "List booked meetings for a user or organization (GET /scheduled_events). Supply one of `user` or `organization`.",
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
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "canceled", label: "Canceled" },
      ],
    },
    {
      key: "inviteeEmail",
      label: "Invitee email",
      type: "string",
      hint: "Filter to events an invitee with this email is part of.",
    },
    {
      key: "minStartTime",
      label: "Min start time",
      type: "datetime",
      hint: "ISO 8601 (e.g. 2026-07-27T00:00:00Z).",
    },
    {
      key: "maxStartTime",
      label: "Max start time",
      type: "datetime",
      hint: "ISO 8601 (e.g. 2026-08-27T00:00:00Z).",
    },
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
    { key: "collection", type: "array", label: "Scheduled events" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    return new CalendlyClient(ctx).request("/scheduled_events", {
      query: {
        user: input.user,
        organization: input.organization,
        status: input.status,
        invitee_email: input.inviteeEmail,
        min_start_time: input.minStartTime,
        max_start_time: input.maxStartTime,
        count: input.count,
        page_token: input.pageToken,
      },
    });
  },
};

export default scheduledEventGetMany;
