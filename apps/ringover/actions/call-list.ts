import type { ActionDefinition } from "@w6w/types";
import { callsResult, RingoverClient, strList } from "../lib/client.ts";
import {
  CALL_TYPES,
  CALLS_OUTPUT,
  endDateParam,
  expandParam,
  lastIdParam,
  limitParam,
  offsetParam,
  startDateParam,
} from "../lib/params.ts";

interface Input {
  startDate?: string;
  endDate?: string;
  callType?: string[] | string;
  limitCount?: number;
  limitOffset?: number;
  lastIdReturned?: number;
  expand?: string[] | string;
}

const callList: ActionDefinition<Input> = {
  key: "call-list",
  type: "read",
  resource: "call",
  title: "List Calls",
  description:
    "List terminated calls, newest first. Defaults to the last 15 days, 100 results; page with Offset (max 9000) or the Last ID cursor.",
  params: [
    startDateParam,
    endDateParam,
    { key: "callType", label: "Call types", type: "multiselect", options: CALL_TYPES },
    limitParam(1000),
    offsetParam,
    lastIdParam,
    expandParam,
  ],
  output: CALLS_OUTPUT,

  async execute(input, ctx) {
    const body = await new RingoverClient(ctx).request("GET", "/calls", {
      query: {
        start_date: input.startDate,
        end_date: input.endDate,
        call_type: strList(input.callType),
        limit_count: input.limitCount,
        limit_offset: input.limitOffset,
        last_id_returned: input.lastIdReturned,
        expand: strList(input.expand),
      },
    });
    return callsResult(body);
  },
};

export default callList;
