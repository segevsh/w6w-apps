import type { TriggerDefinition } from "@w6w/types";
import listMessages from "../actions/list-messages.ts";
import { checkSince, PAGE_SIZE } from "../lib/triggers.ts";

interface Item {
  message_uuid: string;
  message_time?: string;
}

const trigger: TriggerDefinition = {
  key: "new-message",
  title: "New Message",
  description: "The run gets each new message (inbound or outbound) on the Plivo account.",
  output: [
    { key: "message_uuid", type: "string", label: "Message UUID" },
    { key: "message_direction", type: "string", label: "Direction" },
    { key: "message_state", type: "string", label: "State" },
    { key: "from_number", type: "string", label: "From" },
    { key: "to_number", type: "string", label: "To" },
    { key: "message_time", type: "string", label: "Message time" },
  ],
  sample: {
    message_uuid: "b48d95dc-e3ac-11eb-a9c2-0242ac110005",
    message_direction: "inbound",
    message_state: "received",
    from_number: "12401234567",
    to_number: "14155550100",
    message_time: "2026-11-09 13:04:06.799021+00:00",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return await checkSince<Item>({
      state,
      ctx,
      list: async (since, offset) =>
        ((await listMessages.execute(
          { after: since, limit: PAGE_SIZE, offset },
          ctx,
        )) as { objects?: unknown[] }).objects ?? [],
      idOf: (item) => item.message_uuid,
      stampOf: (item) => item.message_time,
    });
  },
};

export default trigger;
