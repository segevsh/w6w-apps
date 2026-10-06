import type { ActionDefinition } from "@w6w/types";
import { PlivoClient } from "../lib/client.ts";
import { PAGE_PARAMS } from "../lib/params.ts";
import type { Page } from "../lib/params.ts";

interface Input extends Page {
  callUuid?: string;
  fromNumber?: string;
  toNumber?: string;
  addedAfter?: string;
  addedBefore?: string;
}

/**
 * `GET /v1/Account/{auth_id}/Recording/` — recording METADATA. `recording_url`
 * in the result points at a different host (a media/storage host), which this
 * app neither fetches nor allowlists; download it in a step that is allowed to.
 */
const listRecordings: ActionDefinition<Input> = {
  key: "list-recordings",
  type: "read",
  resource: "recording",
  title: "List Recordings",
  description: "List call recording metadata (id, duration, format, URL) with optional filters.",
  params: [
    { key: "callUuid", label: "Call UUID", type: "string" },
    { key: "fromNumber", label: "From number", type: "string" },
    { key: "toNumber", label: "To number", type: "string" },
    {
      key: "addedAfter",
      label: "Added on or after",
      type: "string",
      placeholder: "2026-10-01 00:00:00",
      hint: "YYYY-MM-DD HH:MM[:ss[.uuuuuu]]",
    },
    { key: "addedBefore", label: "Added on or before", type: "string" },
    ...PAGE_PARAMS,
  ],

  output: [
    { key: "api_id", type: "string", label: "Request ID" },
    {
      key: "meta",
      type: "object",
      label: "Pagination (limit, offset, total_count, next, previous)",
    },
    { key: "objects", type: "array", label: "Recording records" },
  ],

  execute(input, ctx) {
    return new PlivoClient(ctx).request("Recording/", {
      query: {
        call_uuid: input.callUuid,
        from_number: input.fromNumber,
        to_number: input.toNumber,
        add_time__gte: input.addedAfter,
        add_time__lte: input.addedBefore,
        limit: input.limit,
        offset: input.offset,
      },
    });
  },
};

export default listRecordings;
