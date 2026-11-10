import type { ActionDefinition } from "@w6w/types";
import { arrayAt, idField, snapshotTrigger } from "../lib/triggers.ts";
import groupsList from "../actions/groups-list.ts";

export default snapshotTrigger<{ phoneNumber: string }>({
  key: "new-group",
  title: "New WhatsApp Group",
  description: "The run gets each new WhatsApp group a connected number is in.",
  action: groupsList as unknown as ActionDefinition,
  input: (p) => ({ phoneNumber: p.phoneNumber }),
  pick: (result) => arrayAt(result, "data"),
  idOf: idField("uuid"),
  params: [{
    key: "phoneNumber",
    label: "Connected number",
    type: "string",
    required: true,
    hint: "The WhatsApp Web number connected to 2Chat, E.164 with the leading +.",
  }],
  output: [
    { key: "uuid", type: "string", label: "Group UUID" },
    { key: "wa_group_name", type: "string", label: "Group name" },
    { key: "channel_uuid", type: "string", label: "Channel UUID" },
    { key: "size", type: "number", label: "Participants" },
    { key: "created_at", type: "string", label: "Registered on 2Chat" },
  ],
  sample: {
    uuid: "WAG768beeef-2b96-4bc7-9b7f-045078568723",
    wa_group_name: "Team chat",
    channel_uuid: "WPN95841312-b54d-46e3-b0bc-6414f4a5296b",
    size: 4,
    created_at: "2023-06-22T20:02:56Z",
  },
});
