import type { ActionDefinition } from "@w6w/types";
import { compact, FellowClient, nonEmpty, paginationBody, toList } from "../lib/client.ts";
import { CURSOR, ON_BEHALF_OF, PAGE_SIZE, windowParams } from "../lib/params.ts";

interface Input {
  pageSize?: number;
  cursor?: string;
  includeAttendees?: boolean;
  includeOrganizerEmail?: boolean;
  includeContentMarkdown?: boolean;
  includeContentFellowMarkdown?: boolean;
  eventGuid?: string;
  channelId?: string;
  title?: string;
  eventAttendees?: string[] | string;
  createdAtStart?: string;
  createdAtEnd?: string;
  updatedAtStart?: string;
  updatedAtEnd?: string;
  onBehalfOf?: string;
}

const noteList: ActionDefinition<Input> = {
  key: "note-list",
  type: "search",
  resource: "note",
  title: "List Notes",
  description:
    "List notes with optional filters, one page at a time. Note bodies and attendees are opt-in.",
  params: [
    PAGE_SIZE,
    CURSOR,
    {
      key: "includeAttendees",
      label: "Include attendees",
      type: "boolean",
      hint: "Adds `event_attendees` to each note.",
    },
    {
      key: "includeOrganizerEmail",
      label: "Include organizer email",
      type: "boolean",
      hint:
        "Adds `organizer_email`. Read from one attendee's copy of the calendar event, so it can differ between requests.",
    },
    {
      key: "includeContentMarkdown",
      label: "Include content (markdown)",
      type: "boolean",
      hint:
        "Adds `content_markdown`: a lossy, read-only rendering. Not valid input for the agenda write actions.",
    },
    {
      key: "includeContentFellowMarkdown",
      label: "Include content (Fellow Markdown)",
      type: "boolean",
      hint:
        "Adds `content_fellow_markdown`, the editable round-trip format. Null when the note exceeds Fellow's serialization limits.",
    },
    { key: "eventGuid", label: "Calendar event GUID", type: "string" },
    { key: "channelId", label: "Channel ID", type: "string" },
    { key: "title", label: "Title", type: "string" },
    {
      key: "eventAttendees",
      label: "Attendee emails",
      type: "string",
      hint: "Comma-separated emails; only notes of meetings with these attendees.",
    },
    ...windowParams("notes"),
    ON_BEHALF_OF,
  ],
  output: [
    { key: "items", type: "array", label: "Notes on this page" },
    { key: "cursor", type: "string", label: "Cursor for the next page (null at the end)" },
    { key: "pageSize", type: "number", label: "Page size used" },
    { key: "hasMore", type: "boolean", label: "Whether another page exists" },
  ],

  execute(input, ctx) {
    return new FellowClient(ctx).page("notes", "/notes", {
      method: "POST",
      body: compact({
        pagination: paginationBody(input.pageSize, input.cursor),
        include: nonEmpty({
          event_attendees: input.includeAttendees === true ? true : undefined,
          organizer_email: input.includeOrganizerEmail === true ? true : undefined,
          content_markdown: input.includeContentMarkdown === true ? true : undefined,
          content_fellow_markdown: input.includeContentFellowMarkdown === true ? true : undefined,
        }),
        filters: nonEmpty({
          event_guid: input.eventGuid,
          channel_id: input.channelId,
          title: input.title,
          event_attendees: toList(input.eventAttendees),
          created_at_start: input.createdAtStart,
          created_at_end: input.createdAtEnd,
          updated_at_start: input.updatedAtStart,
          updated_at_end: input.updatedAtEnd,
        }),
      }),
      onBehalfOf: input.onBehalfOf,
    });
  },
};

export default noteList;
