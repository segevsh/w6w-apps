import type { ActionDefinition } from "@w6w/types";
import { compact, flatten, type JsonApiDocument, NationBuilderClient } from "../lib/client.ts";

interface Input {
  name: string;
  siteId?: string;
  pageId?: string;
  slug?: string;
  startAt?: string;
  timeZone?: string;
  duration?: number;
  venueName?: string;
  content?: string;
  acceptRsvps?: boolean;
  capacityCount?: number;
  isPrivate?: boolean;
}

/**
 * `POST /api/v2/events` — confirmed against the vendor's OpenAPI spec
 * (`nationbuilder.com/api/v2/reference`, fetched 2026-09-15).
 *
 * ## An event has no name of its own
 *
 * The `event` resource's writable attributes (`start_at`, `venue_name`,
 * `content`, `accept_rsvps`, ...) do not include a name or title — the
 * public-facing name lives on the **Page** the event is attached to (a
 * `pages` resource, `name`/`title`/`slug`/`site_id`), linked through the
 * event's `page` relationship. NationBuilder's own "Core Concepts" guide
 * confirms the general pattern: "creating a petition requires the creation
 * of a page at the same time" — the same is true here, just not spelled out
 * on the event schema itself. This action creates that page inline via a
 * JSON:API sidepost (the `included` array + a `temp-id`, the same mechanism
 * the guide's signup/recruiter example uses) when `pageId` is left blank, or
 * links an existing page when one is given.
 *
 * `siteId` (an existing Site the page belongs to) is required to create a
 * new page — find one via the nation's own control panel, since this app
 * does not expose a `sites` listing action.
 */
const eventCreate: ActionDefinition<Input> = {
  key: "event-create",
  type: "perform",
  resource: "event",
  title: "Create Event",
  description:
    "Create an event. Creates a new public page for it (needs a Site ID) unless an existing " +
    "Page ID is given.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "siteId",
      label: "Site ID",
      type: "string",
      hint: "Required to create a new page for this event. Ignored if Page ID is given.",
    },
    {
      key: "pageId",
      label: "Existing Page ID",
      type: "string",
      advanced: true,
      hint: "Attach the event to a page that already exists, instead of creating a new one.",
    },
    { key: "slug", label: "Slug", type: "string", advanced: true },
    { key: "startAt", label: "Start time (ISO 8601)", type: "datetime" },
    { key: "timeZone", label: "Time zone", type: "string" },
    { key: "duration", label: "Duration (seconds)", type: "number" },
    { key: "venueName", label: "Venue name", type: "string" },
    { key: "content", label: "Description", type: "text" },
    { key: "acceptRsvps", label: "Accept RSVPs", type: "boolean", default: true },
    { key: "capacityCount", label: "RSVP capacity (0 = unlimited)", type: "number" },
    { key: "isPrivate", label: "Private (hidden from the website)", type: "boolean" },
  ],
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "start_at", type: "string", label: "Start time" },
  ],

  async execute(input, ctx) {
    if (!input.pageId && !input.siteId) {
      throw new Error(
        "either `siteId` (to create a new page for this event) or `pageId` (to attach an " +
          "existing one) is required",
      );
    }

    const attributes = compact({
      start_at: input.startAt,
      time_zone: input.timeZone,
      duration: input.duration,
      venue_name: input.venueName,
      content: input.content,
      accept_rsvps: input.acceptRsvps,
      capacity_count: input.capacityCount,
      private: input.isPrivate,
    });

    const page = input.pageId
      ? { data: { type: "pages", id: input.pageId } }
      : { data: { type: "pages", "temp-id": "event-page", method: "create" } };

    const body: Record<string, unknown> = {
      data: {
        type: "events",
        attributes,
        relationships: { page },
      },
    };
    if (!input.pageId) {
      body.included = [{
        type: "pages",
        "temp-id": "event-page",
        attributes: compact({
          name: input.name,
          title: input.name,
          slug: input.slug,
          site_id: input.siteId,
          page_type_name: "Basic",
          permission_level: "anyone",
          status: "unlisted",
        }),
      }];
    }

    const res = await new NationBuilderClient(ctx).request<JsonApiDocument>("/events", {
      method: "POST",
      body,
    });
    return flatten(Array.isArray(res.data) ? undefined : res.data);
  },
};

export default eventCreate;
