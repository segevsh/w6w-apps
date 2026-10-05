import type { ActionDefinition } from "@w6w/types";
import { compact, FellowClient, nonEmpty, paginationBody } from "../lib/client.ts";
import { CURSOR, ON_BEHALF_OF, PAGE_SIZE, windowParams } from "../lib/params.ts";

interface Input {
  pageSize?: number;
  cursor?: string;
  includeTranscript?: boolean;
  includeAiNotes?: boolean;
  mediaUrlExpiresIn?: number;
  eventGuid?: string;
  channelId?: string;
  title?: string;
  createdAtStart?: string;
  createdAtEnd?: string;
  updatedAtStart?: string;
  updatedAtEnd?: string;
  onBehalfOf?: string;
}

const recordingList: ActionDefinition<Input> = {
  key: "recording-list",
  type: "search",
  resource: "recording",
  title: "List Recordings",
  description:
    "List recordings with optional filters, one page at a time. Transcripts and AI notes are opt-in because they are large.",
  params: [
    PAGE_SIZE,
    CURSOR,
    {
      key: "includeTranscript",
      label: "Include transcript",
      type: "boolean",
      hint: "Adds `transcript` (speech segments) to each recording. Large.",
    },
    {
      key: "includeAiNotes",
      label: "Include AI notes",
      type: "boolean",
      hint: "Adds `ai_notes` (key moments, topics, action items, decisions) to each recording.",
    },
    {
      key: "eventGuid",
      label: "Calendar event GUID",
      type: "string",
      hint: "Only recordings of this calendar event.",
    },
    {
      key: "channelId",
      label: "Channel ID",
      type: "string",
      hint: "Only recordings published to this channel.",
    },
    { key: "title", label: "Title", type: "string", hint: "Title filter, as Fellow matches it." },
    ...windowParams("recordings"),
    {
      key: "mediaUrlExpiresIn",
      label: "Media URL lifetime (seconds)",
      type: "number",
      validation: { min: 3600, max: 86400, integer: true },
      hint:
        "Only used when the key is privileged (Super Admin): the pre-signed `media_url` lifetime, 3600–86400 s. Fellow defaults to 12 hours.",
    },
    ON_BEHALF_OF,
  ],
  output: [
    { key: "items", type: "array", label: "Recordings on this page" },
    { key: "cursor", type: "string", label: "Cursor for the next page (null at the end)" },
    { key: "pageSize", type: "number", label: "Page size used" },
    { key: "hasMore", type: "boolean", label: "Whether another page exists" },
  ],

  execute(input, ctx) {
    const body = compact({
      pagination: paginationBody(input.pageSize, input.cursor),
      include: nonEmpty({
        transcript: input.includeTranscript === true ? true : undefined,
        ai_notes: input.includeAiNotes === true ? true : undefined,
      }),
      filters: nonEmpty({
        event_guid: input.eventGuid,
        channel_id: input.channelId,
        title: input.title,
        created_at_start: input.createdAtStart,
        created_at_end: input.createdAtEnd,
        updated_at_start: input.updatedAtStart,
        updated_at_end: input.updatedAtEnd,
      }),
      media_url: nonEmpty({ expire_in: input.mediaUrlExpiresIn }),
    });
    return new FellowClient(ctx).page("recordings", "/recordings", {
      method: "POST",
      body,
      onBehalfOf: input.onBehalfOf,
    });
  },
};

export default recordingList;
