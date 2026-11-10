import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import groupMessagesList from "../actions/group-messages-list.ts";

export default pollFromListAction<{ groupUuid: string }>({
  key: "new-group-message",
  title: "New WhatsApp Group Message",
  description: "The run gets each new message in a WhatsApp group.",
  action: groupMessagesList as unknown as ActionDefinition,
  input: (p) => ({ groupUuid: p.groupUuid, pageNumber: 0 }),
  items: (result) => (result as { messages?: unknown[] }).messages ?? [],
  idOf: (item) => String((item as { uuid?: unknown }).uuid ?? ""),
  params: [{
    key: "groupUuid",
    label: "Group UUID",
    type: "string",
    required: true,
    hint: "Starts with WAG. From List WhatsApp Groups.",
  }],
  output: [
    { key: "uuid", type: "string", label: "Message ID" },
    { key: "session_key", type: "string", label: "Session key" },
    { key: "message", type: "object", label: "Message (text, media)" },
    { key: "created_at", type: "string", label: "Sent at" },
    { key: "sent_by", type: "string", label: "Sent by" },
    { key: "participant", type: "object", label: "Sending participant" },
  ],
  sample: {
    uuid: "MSGa9b1ea05-ab5b-4082-b36d-6dd297d861cb",
    session_key: "WW-WPN66037eca-9ad1-4c96-9eff-526a90a48c77-111111111111111111@g.us",
    message: { text: "Hello group" },
    created_at: "2025-01-03T14:19:28",
    sent_by: "user",
    participant: { phone_number: "+17131112222", device: "ios", pushname: "Sam" },
  },
  maxPages: 1,
});
