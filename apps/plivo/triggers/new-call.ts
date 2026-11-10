import type { TriggerDefinition } from "@w6w/types";
import listCalls from "../actions/list-calls.ts";
import { checkSince, PAGE_SIZE } from "../lib/triggers.ts";

interface Item {
  call_uuid: string;
  end_time?: string;
}

const trigger: TriggerDefinition = {
  key: "new-call",
  title: "New Call",
  description: "The run gets each newly completed call detail record on the Plivo account.",
  output: [
    { key: "call_uuid", type: "string", label: "Call UUID" },
    { key: "call_direction", type: "string", label: "Direction" },
    { key: "from_number", type: "string", label: "From" },
    { key: "to_number", type: "string", label: "To" },
    { key: "call_duration", type: "number", label: "Duration (s)" },
    { key: "end_time", type: "string", label: "End time" },
  ],
  sample: {
    call_uuid: "57a1b60a-5c0b-11e7-9082-ef888d0400e9",
    call_direction: "outbound",
    from_number: "12025551111",
    to_number: "19172592277",
    call_duration: 11,
    end_time: "2026-11-09 19:39:15+00:00",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return await checkSince<Item>({
      state,
      ctx,
      list: async (since, offset) =>
        ((await listCalls.execute(
          { endedAfter: since, limit: PAGE_SIZE, offset },
          ctx,
        )) as { objects?: unknown[] }).objects ?? [],
      idOf: (item) => item.call_uuid,
      stampOf: (item) => item.end_time,
    });
  },
};

export default trigger;
