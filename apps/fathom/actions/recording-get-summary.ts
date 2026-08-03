import type { ActionDefinition } from "@w6w/types";
import { FathomClient } from "../lib/client.ts";
import { destinationUrlParam, recordingIdParam } from "../lib/params.ts";

interface Input {
  recordingId: number;
  destinationUrl?: string;
}

/**
 * `GET /recordings/{recording_id}/summary` — the AI-generated summary for one
 * recording, as `{ summary: { template_name, markdown_formatted } }`.
 *
 * `markdown_formatted` is documented as "always displayed in English", whatever
 * the meeting's `transcript_language`.
 *
 * Two modes, both the vendor's:
 *
 *   - no `destinationUrl` → the summary comes back inline (this is the useful
 *     mode inside a workflow step, so it is the default);
 *   - `destinationUrl` set → Fathom POSTs the summary there and this returns
 *     only `{ destination_url }`.
 *
 * A **heavy** request either way: 30 calls / 60s, dropping to 5 during elevated
 * activity.
 */
const recordingGetSummary: ActionDefinition<Input, Record<string, unknown>> = {
  key: "recording-get-summary",
  type: "read",
  resource: "recording",
  title: "Get Recording Summary",
  description: "Fetch the AI summary for one meeting recording.",
  params: [recordingIdParam, destinationUrlParam],
  output: [
    { key: "summary", type: "object", label: "Summary (template_name, markdown_formatted)" },
    {
      key: "destination_url",
      type: "string",
      label: "Where Fathom will POST the summary (async mode only)",
    },
  ],

  async execute(input, ctx) {
    const body = await new FathomClient(ctx).request<Record<string, unknown>>(
      `/recordings/${encodeURIComponent(String(input.recordingId))}/summary`,
      { query: { destination_url: input.destinationUrl } },
    );
    return body ?? {};
  },
};

export default recordingGetSummary;
