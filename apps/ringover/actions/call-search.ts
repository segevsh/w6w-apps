import type { ActionDefinition } from "@w6w/types";
import {
  callsResult,
  compact,
  intList,
  jsonValue,
  RingoverClient,
  strList,
} from "../lib/client.ts";
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
  filter?: string;
  startDate?: string;
  endDate?: string;
  callType?: string[] | string;
  advanced?: unknown;
  tags?: string[] | string;
  contacts?: string[] | string;
  stars?: string[] | string;
  note?: boolean;
  tag?: boolean;
  limitCount?: number;
  limitOffset?: number;
  lastIdReturned?: number;
  expand?: string[] | string;
}

const callSearch: ActionDefinition<Input> = {
  key: "call-search",
  type: "read",
  resource: "call",
  title: "Search Calls",
  description:
    "List terminated calls with advanced filters: scope (direct, IVR or advanced users/groups/IVRs/numbers), call types, stars, contacts, tags and outcome flags.",
  params: [
    {
      key: "filter",
      label: "Scope",
      type: "select",
      options: [{ value: "ALL", label: "All calls" }, { value: "DIRECT", label: "Direct calls" }, {
        value: "IVR",
        label: "IVR calls",
      }, { value: "ADVANCED", label: "Advanced (use the Advanced field)" }],
    },
    startDateParam,
    endDateParam,
    { key: "callType", label: "Call types", type: "multiselect", options: CALL_TYPES },
    {
      key: "advanced",
      label: "Advanced filters",
      type: "json",
      hint:
        `Used only with scope ADVANCED: {"users":[1],"groups":[2],"ivrs":[3],"ext_numbers":[33612345678],"int_numbers":[33140000000]}.`,
    },
    { key: "tags", label: "Tag IDs", type: "string", hint: "Comma-separated tag IDs." },
    { key: "contacts", label: "Contact IDs", type: "string", hint: "Comma-separated contact IDs." },
    { key: "stars", label: "Stars", type: "string", hint: "Comma-separated star ratings." },
    { key: "note", label: "Has a note", type: "boolean" },
    { key: "tag", label: "Has a tag", type: "boolean" },
    limitParam(1000),
    offsetParam,
    lastIdParam,
    expandParam,
  ],
  output: CALLS_OUTPUT,

  async execute(input, ctx) {
    const body = await new RingoverClient(ctx).request("POST", "/calls", {
      query: { expand: strList(input.expand) },
      body: compact({
        filter: input.filter || undefined,
        start_date: input.startDate,
        end_date: input.endDate,
        call_type: strList(input.callType),
        advanced: jsonValue(input.advanced),
        tags: intList(input.tags),
        contacts: intList(input.contacts),
        stars: intList(input.stars),
        note: input.note,
        tag: input.tag,
        limit_count: input.limitCount,
        limit_offset: input.limitOffset,
        last_id_returned: input.lastIdReturned,
      }),
    });
    return callsResult(body);
  },
};

export default callSearch;
