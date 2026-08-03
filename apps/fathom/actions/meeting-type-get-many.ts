import type { ActionDefinition } from "@w6w/types";
import { FathomClient, type ListResult } from "../lib/client.ts";
import { cursorParam, listOutput } from "../lib/params.ts";

interface Input {
  cursor?: string;
}

/**
 * `GET /meeting_types` — the org's meeting types, both `active` and `inactive`.
 *
 * This is the lookup table behind Get Many Meetings' `meetingType` filter: that
 * filter matches on the `name` returned here, and an unknown name silently
 * returns an empty list rather than an error — so resolving names through this
 * action first is the difference between "no meetings matched" and "the filter
 * was misspelt".
 *
 * `inactive` types are still returned because they can still appear on
 * historical meetings; they just are not assigned going forward.
 */
const meetingTypeGetMany: ActionDefinition<Input, ListResult> = {
  key: "meeting-type-get-many",
  type: "search",
  resource: "meeting-type",
  title: "Get Many Meeting Types",
  description:
    "List the org's meeting types (active and inactive) — the valid values for the meeting type filter.",
  params: [cursorParam],
  output: listOutput,

  execute(input, ctx) {
    return new FathomClient(ctx).list("/meeting_types", {
      query: { cursor: input.cursor },
    });
  },
};

export default meetingTypeGetMany;
