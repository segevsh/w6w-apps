import type { ActionDefinition } from "@w6w/types";
import { PlivoClient } from "../lib/client.ts";
import { PAGE_PARAMS } from "../lib/params.ts";
import type { Page } from "../lib/params.ts";

interface Input extends Page {
  fromNumber?: string;
  toNumber?: string;
  direction?: "inbound" | "outbound";
  endedAfter?: string;
  endedBefore?: string;
  hangupCauseCode?: number;
}

/**
 * `GET /v1/Account/{auth_id}/Call/` — completed-call CDRs. Plivo searches the
 * last 7 days unless an end-time filter is given, only reaches back 90 days,
 * and a single search spans at most 30 days.
 */
const listCalls: ActionDefinition<Input> = {
  key: "list-calls",
  type: "read",
  resource: "call",
  title: "List Calls",
  description: "List call detail records with optional filters.",
  params: [
    { key: "fromNumber", label: "From number", type: "string" },
    { key: "toNumber", label: "To number", type: "string" },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [{ value: "outbound", label: "Outbound" }, { value: "inbound", label: "Inbound" }],
    },
    {
      key: "endedAfter",
      label: "Ended on or after",
      type: "string",
      placeholder: "2026-10-01 00:00:00",
      hint:
        "YYYY-MM-DD HH:MM[:ss]. Without an end-time filter Plivo searches only the last 7 days; the maximum range is 30 days.",
    },
    {
      key: "endedBefore",
      label: "Ended on or before",
      type: "string",
      placeholder: "2026-10-06 00:00:00",
    },
    { key: "hangupCauseCode", label: "Hangup cause code", type: "number" },
    ...PAGE_PARAMS,
  ],

  output: [
    { key: "api_id", type: "string", label: "Request ID" },
    {
      key: "meta",
      type: "object",
      label: "Pagination (limit, offset, total_count, next, previous)",
    },
    { key: "objects", type: "array", label: "Call records" },
  ],

  execute(input, ctx) {
    return new PlivoClient(ctx).request("Call/", {
      query: {
        from_number: input.fromNumber,
        to_number: input.toNumber,
        call_direction: input.direction,
        end_time__gte: input.endedAfter,
        end_time__lte: input.endedBefore,
        hangup_cause_code: input.hangupCauseCode,
        limit: input.limit,
        offset: input.offset,
      },
    });
  },
};

export default listCalls;
