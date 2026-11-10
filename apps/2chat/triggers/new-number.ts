import type { ActionDefinition } from "@w6w/types";
import { arrayAt, idField, snapshotTrigger } from "../lib/triggers.ts";
import numbersList from "../actions/numbers-list.ts";

export default snapshotTrigger<Record<string, never>>({
  key: "new-number",
  title: "New WhatsApp Number",
  description: "The run gets each new WhatsApp Web number connected to the account.",
  action: numbersList as unknown as ActionDefinition,
  input: () => ({ status: "all" }),
  pick: (result) => arrayAt(result, "numbers"),
  idOf: idField("uuid"),
  output: [
    { key: "uuid", type: "string", label: "Channel UUID" },
    { key: "friendly_name", type: "string", label: "Friendly name" },
    { key: "phone_number", type: "string", label: "Phone number" },
    { key: "connection_status", type: "string", label: "Connection status" },
  ],
  sample: {
    uuid: "WPN582e4db7-6391-4e58-b79e-1b92e93a8374",
    friendly_name: "Support line",
    phone_number: "+5255512345678",
    connection_status: "C",
  },
});
