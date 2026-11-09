import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import roomMessageList from "../actions/room-message-list.ts";

interface Params {
  roomId: string;
}

type Message = { message_id?: unknown; send_time?: unknown };

export default pollFromListAction<Params>({
  key: "new-message",
  title: "New Message",
  description:
    "The run gets each new message in a Chatwork chat (the latest 100 are checked, newest first).",
  action: roomMessageList as unknown as ActionDefinition,
  // `force=1` returns the newest messages (up to 100) regardless of the connection's read marker.
  input: (p) => ({ roomId: p.roomId, force: true }),
  params: [{ key: "roomId", label: "Room ID", type: "string", required: true }],
  // Chatwork lists oldest-first; the kit wants newest-first, so order by send_time descending.
  items: (r) =>
    (Array.isArray(r) ? (r as Message[]) : []).slice().sort((a, b) =>
      Number(b.send_time ?? 0) - Number(a.send_time ?? 0)
    ),
  idOf: (v) => String((v as Message).message_id ?? ""),
  output: [
    { key: "message_id", type: "string", label: "Message ID" },
    { key: "account", type: "object", label: "Who posted it" },
    { key: "body", type: "string", label: "Message text" },
    { key: "send_time", type: "number", label: "Sent at (Unix seconds)" },
    { key: "update_time", type: "number", label: "Last edited at (Unix seconds), 0 if never" },
  ],
  sample: {
    message_id: "1234567890",
    account: { account_id: 123, name: "Ada Lovelace" },
    body: "Hello team",
    send_time: 1794128400,
    update_time: 0,
  },
  maxPages: 1,
});
