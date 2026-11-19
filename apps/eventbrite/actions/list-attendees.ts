import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient, type EventbriteListResponse } from "../lib/client.ts";
import { resolveEventbriteFields } from "../lib/fields.ts";
import { toEventbriteTime } from "../lib/time.ts";
import { pageParam, pageQuery, pageSizeParam, pageSizeQuery } from "../lib/paging.ts";
import {
  ATTENDEE_OUTPUT,
  ATTENDEE_SAMPLE,
  PAGINATION_CONTINUATION_OUTPUT,
  PAGINATION_CONTINUATION_SAMPLE,
} from "../lib/outputs.ts";

interface Input {
  scope: "event" | "organization";
  scopeId: string;
  status?: "attending" | "not_attending" | "unpaid";
  changedSince?: string;
  /** Event scope only: the organization endpoint answers 400 to `page_size`. */
  pageSize?: number;
  page?: number;
  continuation?: string;
}

const listAttendees: ActionDefinition<Input> = {
  key: "list-attendees",
  type: "read",
  resource: "attendee",
  title: "List Attendees",
  description: "List attendees for an event or organization.",
  params: [
    {
      key: "scope",
      label: "Scope",
      type: "select",
      required: true,
      default: "event",
      options: [
        { value: "event", label: "Event" },
        { value: "organization", label: "Organization" },
      ],
    },
    {
      key: "scopeId",
      label: "Scope ID",
      type: "string",
      required: true,
      options: { source: "resolveFields", refreshOn: ["scope"] },
      config: { allowCustom: true },
      when: [
        { if: { field: "scope", equals: "event" }, set: { label: "Event ID" } },
        { if: { field: "scope", equals: "organization" }, set: { label: "Organization ID" } },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      placeholder: "All statuses",
      options: [
        { value: "attending", label: "Attending" },
        { value: "not_attending", label: "Not attending" },
        { value: "unpaid", label: "Unpaid (event only)" },
      ],
    },
    { key: "changedSince", label: "Changed since (ISO datetime)", type: "string" },
    pageSizeParam({
      hint: "Attendees per page, 1–200. Eventbrite returns 50 when blank. Event scope only.",
      showIf: { field: "scope", equals: "event" },
    }),
    pageParam(),
    { key: "continuation", label: "Continuation token", type: "string" },
  ],
  resolveFields: resolveEventbriteFields,
  output: [
    { key: "attendees", type: "array", label: "Attendees", items: ATTENDEE_OUTPUT },
    ...PAGINATION_CONTINUATION_OUTPUT,
  ],
  sample: {
    attendees: [ATTENDEE_SAMPLE],
    pagination: PAGINATION_CONTINUATION_SAMPLE,
  },

  execute(input, ctx) {
    if (input.scope === "organization" && input.status === "unpaid") {
      throw new Error("Unpaid attendees can only be listed with Event scope.");
    }
    const client = new EventbriteClient(ctx);
    const id = encodeURIComponent(input.scopeId);
    const path = input.scope === "organization"
      ? `/organizations/${id}/attendees/`
      : `/events/${id}/attendees/`;
    return client.request<EventbriteListResponse<"attendees">>(path, {
      query: {
        status: input.status,
        changed_since: toEventbriteTime(input.changedSince),
        page_size: input.scope === "event" ? pageSizeQuery(input.pageSize) : undefined,
        page: pageQuery(input.page),
        continuation: input.continuation,
      },
    });
  },
};

export default listAttendees;
