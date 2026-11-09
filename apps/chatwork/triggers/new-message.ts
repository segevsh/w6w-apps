import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import roomMessageList from "../actions/room-message-list.ts";
export default pollFromListAction({
  key: "new-message",
  title: "New Message",
  description: "The run gets each new room message.",
  action: roomMessageList as unknown as ActionDefinition,
  input: (p: { roomId: string }) => ({ roomId: p.roomId, force: true }),
  params: [{ key: "roomId", label: "Room ID", type: "string", required: true }],
  items: (r) => Array.isArray(r) ? r : [],
  idOf: (v) => String((v as { message_id?: unknown }).message_id ?? ""),
  output: [{ key: "message_id", type: "string", label: "Message ID" }],
  sample: { message_id: "1" },
  maxPages: 1,
});
