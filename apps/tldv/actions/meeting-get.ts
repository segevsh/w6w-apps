import type { ActionDefinition } from "@w6w/types";
import { TldvClient } from "../lib/client.ts";
import { meetingIdParam } from "../lib/params.ts";

/**
 * `GET /v1alpha1/meetings/{meetingId}` — one meeting's metadata.
 *
 * **`organizer` and `template` are objects on the wire, despite the OpenAPI
 * document typing them `type: "string", format: "json"`.** That annotation
 * contradicts the very `$ref` sitting next to it (`organizer` refs `User`) and
 * the vendor's own webhook payload example shows both as plain nested JSON —
 * `"template": {"id": "template-1", "label": "Standup Template"}` — never a
 * stringified blob to re-parse. The output below follows the `$ref`/example,
 * not the contradictory `type`/`format` pair.
 */
interface Input {
  meetingId: string;
}

const meetingGet: ActionDefinition<Input> = {
  key: "meeting-get",
  type: "read",
  resource: "meeting",
  title: "Get Meeting",
  description: "Get one meeting's metadata by its id.",
  params: [meetingIdParam],
  output: [
    { key: "id", type: "string", label: "Meeting id" },
    { key: "name", type: "string", label: "Meeting name" },
    { key: "happenedAt", type: "string", label: "When the meeting happened (ISO 8601)" },
    { key: "url", type: "string", label: "tldv.io link to the meeting" },
    { key: "duration", type: "number", label: "Duration in seconds" },
    { key: "organizer", type: "object", label: "Organizer (name, email)" },
    { key: "invitees", type: "array", label: "Invited / participating users" },
    { key: "template", type: "object", label: "Meeting template (id, label)" },
    { key: "extraProperties", type: "object", label: "Extra properties (e.g. conferenceId)" },
  ],

  execute(input, ctx) {
    return new TldvClient(ctx).get(`/meetings/${encodeURIComponent(input.meetingId)}`);
  },
};

export default meetingGet;
