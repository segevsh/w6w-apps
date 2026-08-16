import type { ActionDefinition } from "@w6w/types";
import { TldvClient } from "../lib/client.ts";
import { meetingIdParam } from "../lib/params.ts";

/**
 * `GET /v1alpha1/meetings/{meetingId}/notes` — tl;dv's AI-generated notes for
 * a meeting: structured per-topic notes, the same content as Markdown, and the
 * topic list they're organized under.
 *
 * This is the current, supported surface. The sibling `GET
 * /meetings/{meetingId}/highlights` endpoint is marked `deprecated: true` in
 * the vendor's own OpenAPI document — tag `"Highlights (deprecated)"`,
 * description "Use the /meetings/:meetingId/notes endpoint instead" — so this
 * app implements only `notes` and does not add a `highlights-get` action. See
 * the README.
 */
interface Input {
  meetingId: string;
}

const notesGet: ActionDefinition<Input> = {
  key: "notes-get",
  type: "read",
  resource: "notes",
  title: "Get Notes",
  description: "Get a meeting's AI-generated notes, as structured entries, Markdown and topics.",
  params: [meetingIdParam],
  output: [
    { key: "structuredNotes", type: "array", label: "Notes (segmentId, timestamp, text, topicId)" },
    { key: "markdownContent", type: "string", label: "Notes rendered as Markdown" },
    { key: "topics", type: "array", label: "Topics (id, order, title, summary)" },
  ],

  execute(input, ctx) {
    return new TldvClient(ctx).get(`/meetings/${encodeURIComponent(input.meetingId)}/notes`);
  },
};

export default notesGet;
