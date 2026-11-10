import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import getMessages from "../actions/get-messages.ts";

export default pollFromListAction<{ roomId: string }>({
  key: "new-room-message",
  title: "New Room Message",
  description: "The run gets each new event in a Matrix room.",
  action: getMessages as unknown as ActionDefinition,
  params: [{ key: "roomId", label: "Room ID", type: "string", required: true }],
  input: (params) => ({ roomId: String(params.roomId ?? ""), direction: "b", limit: 100 }),
  items: (result) => (result as { events?: unknown[] }).events ?? [],
  idOf: (item) => String((item as { event_id?: unknown }).event_id ?? ""),
  output: [{ key: "event_id", type: "string", label: "Event ID" }],
  sample: { event_id: "$event1:example.org", type: "m.room.message" },
  maxPages: 1,
});
